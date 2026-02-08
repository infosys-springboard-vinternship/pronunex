/**
 * useApi Hook
 * Data fetching with loading, error, and refetch
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { api, ApiError, ERROR_CODES } from '../api/client';

/**
 * Hook for API data fetching
 * @param {string} endpoint - API endpoint to fetch
 * @param {Object} options - Options { immediate, deps }
 */
export function useApi(endpoint, options = {}) {
    const { immediate = true, deps = [] } = options;

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(immediate);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);

    const fetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.get(endpoint);

            if (mountedRef.current) {
                setData(response.data);
                setIsLoading(false);
            }

            return response.data;
        } catch (err) {
            if (mountedRef.current) {
                setError(err instanceof ApiError ? err : new ApiError(ERROR_CODES.UNKNOWN, err.message, 0));
                setIsLoading(false);
            }

            throw err;
        }
    }, [endpoint]);

    const refetch = useCallback(() => {
        return fetch();
    }, [fetch]);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;

        if (immediate) {
            fetch();
        }

        return () => {
            mountedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [immediate, endpoint, ...deps]);

    return {
        data,
        isLoading,
        error,
        refetch,
        setData,
    };
}

/**
 * Hook for API mutations (POST, PUT, DELETE)
 */
export function useMutation() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(async (mutationFn) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await mutationFn();
            setIsLoading(false);
            return result;
        } catch (err) {
            setError(err instanceof ApiError ? err : new ApiError(ERROR_CODES.UNKNOWN, err.message, 0));
            setIsLoading(false);
            throw err;
        }
    }, []);

    const reset = useCallback(() => {
        setError(null);
    }, []);

    return {
        mutate,
        isLoading,
        error,
        reset,
    };
}

export default useApi;
