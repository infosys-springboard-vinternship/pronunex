/**
 * useDashboard Hook
 * 
 * Shared hook for dashboard data — deduplicates API calls.
 * Multiple components calling this hook share the same cached response.
 * Prevents duplicate /analytics/progress/ calls caused by React StrictMode
 * or multiple components mounting simultaneously.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { api, ApiError, ERROR_CODES } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

// Module-level cache: shared across all hook instances
let _cache = {
    data: null,
    promise: null,
    timestamp: 0,
    endpoint: null,
};

const STALE_MS = 5 * 60 * 1000; // 5 minutes — matches backend cache TTL

/**
 * Shared dashboard data hook.
 * Only fires ONE API call regardless of how many components use it.
 * 
 * @param {Object} options
 * @param {number} options.days - Number of days (default 30)
 * @param {boolean} options.enabled - Whether to fetch (default true). Set false when not authenticated.
 */
export function useDashboard({ days = 30, enabled = true } = {}) {
    const [data, setData] = useState(_cache.data);
    const [isLoading, setIsLoading] = useState(enabled && !_cache.data);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);

    const endpoint = `${ENDPOINTS.ANALYTICS.PROGRESS}?days=${days}`;

    const fetch = useCallback(async (force = false) => {
        if (!enabled) return null;

        const now = Date.now();

        // Return cached data if still fresh and not forced
        if (
            !force &&
            _cache.data &&
            _cache.endpoint === endpoint &&
            now - _cache.timestamp < STALE_MS
        ) {
            if (mountedRef.current) {
                setData(_cache.data);
                setIsLoading(false);
            }
            return _cache.data;
        }

        // If another call is already in-flight for the same endpoint, piggyback on it
        if (_cache.promise && _cache.endpoint === endpoint && !force) {
            try {
                const result = await _cache.promise;
                if (mountedRef.current) {
                    setData(result);
                    setIsLoading(false);
                }
                return result;
            } catch (err) {
                if (mountedRef.current) {
                    setError(err instanceof ApiError ? err : new ApiError(ERROR_CODES.UNKNOWN, err.message, 0));
                    setIsLoading(false);
                }
                throw err;
            }
        }

        // Fire the actual API call
        setIsLoading(true);
        setError(null);

        const fetchPromise = api.get(endpoint).then(res => res.data);
        _cache.promise = fetchPromise;
        _cache.endpoint = endpoint;

        try {
            const result = await fetchPromise;

            // Store in module-level cache
            _cache.data = result;
            _cache.timestamp = Date.now();
            _cache.promise = null;

            if (mountedRef.current) {
                setData(result);
                setIsLoading(false);
            }

            return result;
        } catch (err) {
            _cache.promise = null;

            if (mountedRef.current) {
                setError(err instanceof ApiError ? err : new ApiError(ERROR_CODES.UNKNOWN, err.message, 0));
                setIsLoading(false);
            }

            throw err;
        }
    }, [endpoint, enabled]);

    const refetch = useCallback(() => fetch(true), [fetch]);

    // Invalidate cache (call after a new attempt is submitted)
    const invalidate = useCallback(() => {
        _cache = { data: null, promise: null, timestamp: 0, endpoint: null };
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        if (enabled) {
            fetch();
        }

        return () => {
            mountedRef.current = false;
        };
    }, [fetch, enabled]);

    return { data, isLoading, error, refetch, invalidate, setData };
}

export default useDashboard;
