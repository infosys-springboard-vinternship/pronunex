/**
 * Global Application Configuration & Defaults
 * Centralizes all user-configurable settings.
 */



export const DEFAULT_SETTINGS = {
    // Appearance
    theme: 'light', // 'light' | 'dark'
    primaryColor: '#059669', // Emerald-500
    fontScale: 100,

    // Notifications
    emailReminders: false,
    browserNotifications: false,
    reminderTime: '09:00',

    // Audio & Microphone
    micSensitivity: 50,
    playbackVolume: 80,

    // Practice Preferences
    defaultDifficulty: 'intermediate', // 'beginner' | 'intermediate' | 'advanced'
    sessionLength: 10, // minutes
    dailyGoal: 10, // number of sentences per day
    autoAdvance: true,

    // System
    apiBaseUrl: 'http://localhost:8000',
};

export const COLOR_PRESETS = [
    {
        name: 'Emerald', value: '#059669', shades: {
            50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
            400: '#34d399', 500: '#059669', 600: '#047857', 700: '#047857',
            800: '#064e3b', 900: '#064e3b'
        }
    },
    {
        name: 'Rose', value: '#e11d48', shades: {
            50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
            400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
            800: '#9f1239', 900: '#881337'
        }
    },
    {
        name: 'Amber', value: '#d97706', shades: {
            50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
            400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
            800: '#92400e', 900: '#78350f'
        }
    },
    {
        name: 'Teal', value: '#0d9488', shades: {
            50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
            400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
            800: '#115e59', 900: '#134e4a'
        }
    }
];

// Keys for localStorage
export const STORAGE_KEYS = {
    SETTINGS: 'pronunex_settings_v1'
};

export const SITE_DATA = {
    general: {
        appName: 'Pronunex',
        tagline: 'Master Your Spoken English with AI-Driven Precision',
        supportEmail: 'maurya972137@gmail.com',
        socialLinks: {
            linkedin: 'https://www.linkedin.com/in/abhishekmaurya9118/',
            github: 'https://github.com/Abhishek-Maurya576'
        }
    },

    docs: {
        sections: [
            {
                id: 'introduction',
                title: 'Introduction',
                content: `Pronunex is an advanced AI-powered speech therapy platform designed to help users master spoken English. By leveraging cutting-edge Natural Language Processing (NLP) and audio analysis, it provides real-time feedback on pronunciation, fluency, and phoneme accuracy.`
            },
            {
                id: 'getting-started',
                title: 'Getting Started',
                content: `To get started with Pronunex:
                1. **Sign Up**: Create an account to track your progress.
                2. **Microphone Setup**: Ensure you have a working microphone and grant browser permissions.
                3. **Dashboard**: Navigate to your dashboard to see your current stats and recommended exercises.`
            },
            {
                id: 'how-to-use',
                title: 'How to Use',
                content: `Using Pronunex is simple and intuitive:
                - **Navigate to Practice**: Select a difficulty level or specific phoneme category.
                - **Record**: Click the microphone icon and read the displayed sentence clearly.
                - **Analyze**: Wait for the AI to process your speech (usually takes 1-2 seconds).
                - **Review**: Check your score, identified mistakes, and suggestions for improvement.`
            },
            {
                id: 'system-flow',
                title: 'System Flow',
                content: 'Diagram Placeholder: User Speech -> Audio Capture -> Backend API -> Speech-to-Text -> Alignment & Scoring -> Feedback Response -> UI Display.'
            },
            {
                id: 'processing-logic',
                title: 'How Processing Works',
                content: `Our core processing pipeline involves several steps:
                1. **Audio Preprocessing**: Noise reduction and normalization.
                2. **ASR (Automatic Speech Recognition)**: Converting speech to text to verify content.
                3. **Forced Alignment**: Aligning audio segments with specific phonemes.
                4. **Scoring Algorithm**: Comparing user phonemes with reference native speaker models to generate confidence scores.`
            },
            {
                id: 'dashboard-guide',
                title: 'Understanding the Dashboard',
                content: `Your dashboard is your central hub for progress tracking:
                - **Overall Score**: Your average pronunciation accuracy across all sessions.
                - **Fluency Metric**: Measures the smoothness and pace of your speech.
                - **Weakness Heatmap**: Visualizes specific phonemes you struggle with most.`
            },
            {
                id: 'common-issues',
                title: 'Common Issues',
                content: `**Microphone not detected**: Ensure your browser has permission to access the microphone. check system settings.
                **Low scores**: Try to speak in a quiet environment. Background noise can affect accuracy.`
            },
            {
                id: 'faqs',
                title: 'FAQs',
                content: `**Q: Is Pronunex free?**
                A: We offer a free tier with basic features and premium plans for advanced analytics.
                
                **Q: Can I use it on mobile?**
                A: Yes, Pronunex is fully responsive and works on mobile browsers.`
            }
        ]
    }
};
