/**
 * Progress Configuration
 * Centralized constants for the Progress dashboard
 */

export const PROGRESS_CONFIG = {
    colors: {
        primary: '#14b8a6',
        primaryLight: '#5eead4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        neutral: '#64748b',
    },
    thresholds: {
        mastered: 0.85,
        proficient: 0.70,
        developing: 0.50,
    },
    animations: {
        staggerDelay: 80,
        entranceDuration: 400,
        counterDuration: 1000,
    },
    periods: [
        { key: '7', label: '7 Days' },
        { key: '30', label: '30 Days' },
        { key: '90', label: '90 Days' },
    ],
};

export default PROGRESS_CONFIG;
