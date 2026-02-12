/**
 * Admin Panel Configuration
 * Centralized configuration for admin-specific settings, colors, and constants
 */

export const ADMIN_CONFIG = {
    colors: {
        primary: '#059669',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#0d9488',
        
        accent: {
            primary: '#047857',
            success: '#16a34a',
            warning: '#d97706',
            error: '#dc2626',
            info: '#0f766e',
        },
        
        background: {
            primary: '#059669',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
        },
    },
    
    routes: {
        dashboard: '/admin',
        users: '/admin/users',
        userDetail: (id) => `/admin/users/${id}`,
        sentences: '/admin/sentences',
        analytics: '/admin/analytics',
        scoring: '/admin/scoring',
        logs: '/admin/logs',
    },
    
    permissions: {
        viewUsers: 'is_staff',
        manageUsers: 'is_staff',
        manageSentences: 'is_staff',
        viewAnalytics: 'is_staff',
        editScoring: 'is_staff',
        viewLogs: 'is_staff',
    },
    
    limits: {
        maxRecentLogs: 100,
        maxRecentAttempts: 10,
        chartDataPoints: 30,
        usersPerPage: 20,
        sentencesPerPage: 50,
    },
    
    thresholds: {
        weakPhoneme: 0.7,
        goodAccuracy: 0.75,
        excellentAccuracy: 0.9,
        highPER: 0.6,
        lowPER: 0.1,
    },
};

export default ADMIN_CONFIG;
