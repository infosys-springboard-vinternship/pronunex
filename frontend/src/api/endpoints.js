/**
 * Pronunex API Endpoints
 * Centralized route constants
 */

const API_VERSION = 'v1';
// Use VITE_API_URL from environment, or default to relative path (for proxy)
const API_URL = import.meta.env.VITE_API_URL || '';
const BASE_PATH = `${API_URL}/api/${API_VERSION}`;

export const ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: `${BASE_PATH}/auth/login/`,
        REGISTER: `${BASE_PATH}/auth/register/`,
        LOGOUT: `${BASE_PATH}/auth/logout/`,
        REFRESH: `${BASE_PATH}/auth/token/refresh/`,
        PROFILE: `${BASE_PATH}/auth/profile/`,
        GOOGLE: `${BASE_PATH}/auth/google/`,
        PASSWORD_RESET: `${BASE_PATH}/auth/password/reset/`,
        PASSWORD_RESET_CONFIRM: `${BASE_PATH}/auth/password/reset/confirm/`,
        PASSWORD_CHANGE: `${BASE_PATH}/auth/password/change/`,
    },

    // Library
    PHONEMES: {
        LIST: `${BASE_PATH}/library/phonemes/`,
        DETAIL: (id) => `${BASE_PATH}/library/phonemes/${id}/`,
    },
    SENTENCES: {
        LIST: `${BASE_PATH}/library/sentences/`,
        DETAIL: (id) => `${BASE_PATH}/library/sentences/${id}/`,
        AUDIO: (id) => `${BASE_PATH}/library/sentences/${id}/audio/`,
        RECOMMEND: `${BASE_PATH}/library/sentences/recommend/`,
        PREGENERATE: `${BASE_PATH}/library/sentences/pregenerate/`,
    },

    // Practice
    SESSIONS: {
        LIST: `${BASE_PATH}/practice/sessions/`,
        CREATE: `${BASE_PATH}/practice/sessions/`,
        DETAIL: (id) => `${BASE_PATH}/practice/sessions/${id}/`,
        END: (id) => `${BASE_PATH}/practice/sessions/${id}/end/`,
    },
    ATTEMPTS: {
        LIST: `${BASE_PATH}/practice/attempts/`,
        DETAIL: (id) => `${BASE_PATH}/practice/attempts/${id}/`,
    },
    ASSESS: `${BASE_PATH}/practice/assess/`,

    // Analytics
    ANALYTICS: {
        PROGRESS: `${BASE_PATH}/analytics/progress/`,
        PHONEME_STATS: `${BASE_PATH}/analytics/phoneme-stats/`,
        WEAK_PHONEMES: `${BASE_PATH}/analytics/weak-phonemes/`,
        HISTORY: `${BASE_PATH}/analytics/history/`,
    },

    // Admin
    ADMIN: {
        STATS: `${BASE_PATH}/admin/stats/`,
        USERS: `${BASE_PATH}/admin/users/`,
        USER_DETAIL: (id) => `${BASE_PATH}/admin/users/${id}/`,
        USER_DISABLE: (id) => `${BASE_PATH}/admin/users/${id}/disable/`,
        USER_ENABLE: (id) => `${BASE_PATH}/admin/users/${id}/enable/`,
        USER_RESET: (id) => `${BASE_PATH}/admin/users/${id}/reset-progress/`,
        SENTENCES: `${BASE_PATH}/admin/sentences/`,
        SENTENCE_DETAIL: (id) => `${BASE_PATH}/admin/sentences/${id}/`,
        SENTENCE_GENERATE: `${BASE_PATH}/admin/sentences/generate/`,
        SENTENCE_BULK_IMPORT: `${BASE_PATH}/admin/sentences/bulk-import/`,
        SENTENCE_EXPORT: `${BASE_PATH}/admin/sentences/export/`,
        ANALYTICS: `${BASE_PATH}/admin/analytics/`,
        SCORING: `${BASE_PATH}/admin/scoring/`,
        SCORING_HISTORY: `${BASE_PATH}/admin/scoring/history/`,
        SCORING_ROLLBACK: `${BASE_PATH}/admin/scoring/rollback/`,
        LOGS: `${BASE_PATH}/admin/logs/`,
    },
};

export default ENDPOINTS;
