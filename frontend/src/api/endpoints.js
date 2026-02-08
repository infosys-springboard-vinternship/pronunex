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
    LEARNING_PATHS: {
        LIST: `${BASE_PATH}/library/learning-paths/`,
        DETAIL: (id) => `${BASE_PATH}/library/learning-paths/${id}/`,
        UNITS: (id) => `${BASE_PATH}/library/learning-paths/${id}/units/`,
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

    // Gamification
    GAMIFICATION: {
        DASHBOARD: `${BASE_PATH}/gamification/dashboard/`,
        XP: `${BASE_PATH}/gamification/xp/`,
        SET_XP_GOAL: `${BASE_PATH}/gamification/xp/set-goal/`,
        QUESTS: `${BASE_PATH}/gamification/quests/`,
        ACHIEVEMENTS: `${BASE_PATH}/gamification/achievements/`,
        ACHIEVEMENTS_UNLOCKED: `${BASE_PATH}/gamification/achievements/unlocked/`,
        GEMS: `${BASE_PATH}/gamification/gems/`,
        HEARTS: `${BASE_PATH}/gamification/hearts/`,
        HEARTS_REFILL: `${BASE_PATH}/gamification/hearts/refill/`,
        LEADERBOARD: `${BASE_PATH}/gamification/leaderboard/`,
        LEADERBOARD_FRIENDS: `${BASE_PATH}/gamification/leaderboard/friends/`,
        FRIENDS: `${BASE_PATH}/gamification/friends/`,
        FRIEND_REQUEST: `${BASE_PATH}/gamification/friends/request/`,
        FRIEND_ACCEPT: (id) => `${BASE_PATH}/gamification/friends/${id}/accept/`,
        FRIEND_REJECT: (id) => `${BASE_PATH}/gamification/friends/${id}/reject/`,
        FRIEND_DELETE: (id) => `${BASE_PATH}/gamification/friends/${id}/`,
        STREAK_FREEZE: `${BASE_PATH}/gamification/streak/freeze/`,
    },
};

export default ENDPOINTS;
