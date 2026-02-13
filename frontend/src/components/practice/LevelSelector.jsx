/**
 * LevelSelector Component
 * Premium card-based difficulty level selection shown before practice begins.
 * Users pick a level, then tap "Start Practice" to load sentences for that level.
 */

import { useState } from 'react';
import { Sparkles, Zap, Trophy, ArrowRight } from 'lucide-react';
import './LevelSelector.css';

const LEVELS = [
    {
        key: 'core',
        label: 'Pronunex Core',
        icon: Sparkles,
        description: 'Simple words & clear pronunciation',
        details: 'Short sentences with common vocabulary. Perfect for building confidence.',
        color: 'var(--difficulty-beginner)',
        bgColor: 'var(--difficulty-beginner-bg)',
        borderColor: 'var(--difficulty-beginner-border)',
    },
    {
        key: 'edge',
        label: 'Pronunex Edge',
        icon: Zap,
        description: 'Compound sentences & stress patterns',
        details: 'Longer sentences with varied phonemes. Practice linking and rhythm.',
        color: 'var(--difficulty-intermediate)',
        bgColor: 'var(--difficulty-intermediate-bg)',
        borderColor: 'var(--difficulty-intermediate-border)',
    },
    {
        key: 'elite',
        label: 'Pronunex Elite',
        icon: Trophy,
        description: 'Complex prose, rhythm & elision',
        details: 'Natural speech patterns with reduced vowels and connected speech.',
        color: 'var(--difficulty-advanced)',
        bgColor: 'var(--difficulty-advanced-bg)',
        borderColor: 'var(--difficulty-advanced-border)',
    },
];

/* Map level keys to CSS difficulty modifiers */
const TIER_CLASS_MAP = {
    core: 'level-selector__card--beginner',
    edge: 'level-selector__card--intermediate',
    elite: 'level-selector__card--advanced',
};

function LevelSelector({ defaultLevel = 'core', onSelectLevel }) {
    const [selected, setSelected] = useState(defaultLevel);

    const handleStart = () => {
        if (onSelectLevel) {
            onSelectLevel(selected);
        }
    };

    return (
        <div className="level-selector">
            <div className="level-selector__header">
                <h1 className="level-selector__title">Choose Your Level</h1>
                <p className="level-selector__subtitle">
                    Select a difficulty level to start your practice session
                </p>
            </div>

            <div className="level-selector__cards">
                {LEVELS.map((level) => {
                    const IconComponent = level.icon;
                    const isSelected = selected === level.key;
                    const tierClass = TIER_CLASS_MAP[level.key] || '';

                    return (
                        <button
                            key={level.key}
                            type="button"
                            className={`level-selector__card ${tierClass} ${isSelected ? 'level-selector__card--selected' : ''}`}
                            onClick={() => setSelected(level.key)}
                            aria-pressed={isSelected}
                        >
                            {/* Selection indicator */}
                            <div className="level-selector__check">
                                {isSelected && (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <circle cx="10" cy="10" r="10" fill="currentColor" />
                                        <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                {!isSelected && (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                                    </svg>
                                )}
                            </div>

                            {/* Icon */}
                            <div className="level-selector__icon-ring">
                                <IconComponent size={28} />
                            </div>

                            {/* Text */}
                            <div className="level-selector__card-text">
                                <h3 className="level-selector__card-title">{level.label}</h3>
                                <p className="level-selector__card-desc">{level.description}</p>
                                <p className="level-selector__card-details">{level.details}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                className="level-selector__start-btn"
                onClick={handleStart}
            >
                <span>Start Practice</span>
                <ArrowRight size={20} />
            </button>
        </div>
    );
}

export default LevelSelector;
