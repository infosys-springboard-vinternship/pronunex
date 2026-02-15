/**
 * Pronunex API Client
 * Centralized fetch wrapper with JWT handling and error standardization
 */

import { ENDPOINTS } from './endpoints';

// Error codes for standardized handling
export const ERROR_CODES = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    UNKNOWN: 'UNKNOWN',
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(code, message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        this.data = data;
    }
}

/**
 * API Client class
 */
class ApiClient {
    constructor() {
        this.baseUrl = '';
        this.accessToken = null;
        this.refreshToken = null;
        this.onUnauthorized = null;
        this._isRefreshing = false;
        this._refreshPromise = null;
        this._isLoggingOut = false;
    }

    /**
     * Set auth tokens
     */
    setTokens(access, refresh = null) {
        this.accessToken = access;
        if (refresh) {
            this.refreshToken = refresh;
        }
    }

    /**
     * Clear auth tokens
     */
    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
    }

    /**
     * Set callback for unauthorized responses
     */
    setOnUnauthorized(callback) {
        this.onUnauthorized = callback;
    }

    /**
     * Build headers for request
     */
    _buildHeaders(customHeaders = {}, isFormData = false) {
        const headers = { ...customHeaders };

        // Bypass Ngrok browser warning page (for free tier)
        headers['ngrok-skip-browser-warning'] = 'true';

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        return headers;
    }

    /**
     * Parse error response and return standardized error
     */
    async _parseError(response) {
        let data = null;
        let message = 'An unexpected error occurred';

        try {
            data = await response.json();
            message = data.message || data.detail || data.error || message;
        } catch {
            // Response is not JSON
        }

        const status = response.status;
        let code = ERROR_CODES.UNKNOWN;

        switch (status) {
            case 401:
                code = data?.error_code === 'TOKEN_EXPIRED'
                    ? ERROR_CODES.TOKEN_EXPIRED
                    : ERROR_CODES.UNAUTHORIZED;
                break;
            case 403:
                code = ERROR_CODES.FORBIDDEN;
                break;
            case 404:
                code = ERROR_CODES.NOT_FOUND;
                break;
            case 422:
            case 400:
                code = ERROR_CODES.VALIDATION_ERROR;
                break;
            case 500:
            case 502:
            case 503:
                code = ERROR_CODES.SERVER_ERROR;
                break;
        }

        return new ApiError(code, message, status, data);
    }

    /**
     * Attempt to refresh the access token
     */
    async _refreshAccessToken() {
        if (!this.refreshToken || this._isLoggingOut) {
            return false;
        }

        // Deduplicate concurrent refresh calls — share a single promise
        if (this._isRefreshing && this._refreshPromise) {
            return this._refreshPromise;
        }

        this._isRefreshing = true;
        this._refreshPromise = (async () => {
            try {
                const response = await fetch(ENDPOINTS.AUTH.REFRESH, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: this.refreshToken }),
                });

                if (response.ok) {
                    const data = await response.json();
                    this.accessToken = data.access;
                    // CRITICAL: When ROTATE_REFRESH_TOKENS is enabled,
                    // the backend returns a new refresh token and blacklists the old one.
                    // We MUST save the new refresh token or the next refresh will fail.
                    if (data.refresh) {
                        this.refreshToken = data.refresh;
                        sessionStorage.setItem('refresh_token', data.refresh);
                    }
                    sessionStorage.setItem('access_token', data.access);
                    return true;
                }
            } catch {
                // Refresh failed
            }
            return false;
        })();

        try {
            return await this._refreshPromise;
        } finally {
            this._isRefreshing = false;
            this._refreshPromise = null;
        }
    }

    /**
     * Main request method
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            headers: customHeaders = {},
            retryOnUnauthorized = true,
        } = options;

        const isFormData = body instanceof FormData;
        const headers = this._buildHeaders(customHeaders, isFormData);

        const fetchOptions = {
            method,
            headers,
        };

        if (body) {
            fetchOptions.body = isFormData ? body : JSON.stringify(body);
        }

        let response;

        try {
            response = await fetch(endpoint, fetchOptions);
        } catch (error) {
            throw new ApiError(
                ERROR_CODES.NETWORK_ERROR,
                'Unable to connect to server. Please check your connection.',
                0
            );
        }

        // Handle 401 with token refresh
        if (response.status === 401 && retryOnUnauthorized && !this._isLoggingOut) {
            const refreshed = await this._refreshAccessToken();

            if (refreshed) {
                // Retry request with new token
                return this.request(endpoint, { ...options, retryOnUnauthorized: false });
            }

            // Refresh failed, trigger unauthorized callback (once)
            if (this.onUnauthorized && !this._isLoggingOut) {
                this._isLoggingOut = true;
                this.onUnauthorized();
            }

            throw await this._parseError(response);
        }

        // Handle other errors
        if (!response.ok) {
            throw await this._parseError(response);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return { success: true, data: null };
        }

        // Parse successful response
        const data = await response.json();
        return { success: true, data };
    }

    // Convenience methods
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    async put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    async patch(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PATCH', body });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Upload audio file for assessment
     */
    async uploadAudio(sentenceId, audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('sentence_id', sentenceId);

        return this.post(ENDPOINTS.PRACTICE.ASSESS, formData);
    }
}

// Export singleton instance
export const api = new ApiClient();

export default api;
