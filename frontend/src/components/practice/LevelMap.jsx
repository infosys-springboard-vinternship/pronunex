/**
 * Level Map - Visual progression through units
 * Shows levels as connected nodes like Duolingo
 */

import { useState } from 'react';
import { Lock, Check, Star, Play, Crown } from 'lucide-react';
import './LevelMap.css';

export function LevelMap({
    path,
    units = [],
    userProgress = {},
    onSelectUnit,
    currentUnit
}) {
    // Default units if none provided  
    const displayUnits = units.length > 0 ? units : [
        { id: 1, name: 'Short Vowels', icon: 'volume-2', order: 1 },
        { id: 2, name: 'Long Vowels', icon: 'music', order: 2 },
        { id: 3, name: 'Basic Consonants', icon: 'mic', order: 3 },
        { id: 4, name: 'More Consonants', icon: 'speaker', order: 4 },
        { id: 5, name: 'Nasal Sounds', icon: 'wind', order: 5 }
    ];

    const getUnitStatus = (unit, index) => {
        const progress = userProgress?.unit_progress?.[unit.id] || {};

        if (progress.completed) return 'completed';
        if (progress.crown_level > 0) return 'in-progress';
        if (index === 0) return 'unlocked';

        // Check if previous unit is completed
        const prevUnit = displayUnits[index - 1];
        const prevProgress = userProgress?.unit_progress?.[prevUnit?.id] || {};

        if (prevProgress.completed || prevProgress.crown_level >= 3) return 'unlocked';

        return 'locked';
    };

    const getCrownLevel = (unit) => {
        return userProgress?.unit_progress?.[unit.id]?.crown_level || 0;
    };

    return (
        <div className="level-map">
            <div className="level-map__path-line" />

            {displayUnits.map((unit, index) => {
                const status = getUnitStatus(unit, index);
                const crownLevel = getCrownLevel(unit);
                const isSelected = currentUnit?.id === unit.id;
                const isEven = index % 2 === 0;

                return (
                    <div
                        key={unit.id}
                        className={`level-node level-node--${status} ${isSelected ? 'level-node--selected' : ''}`}
                        style={{
                            '--offset': isEven ? '-30px' : '30px',
                            '--delay': `${index * 0.1}s`
                        }}
                    >
                        <button
                            className="level-node__button"
                            onClick={() => status !== 'locked' && onSelectUnit?.(unit)}
                            disabled={status === 'locked'}
                        >
                            {status === 'locked' && <Lock size={24} />}
                            {status === 'completed' && <Crown size={24} />}
                            {status === 'in-progress' && <Star size={24} />}
                            {status === 'unlocked' && <Play size={24} />}
                        </button>

                        <div className="level-node__info">
                            <span className="level-node__name">{unit.name}</span>
                            {crownLevel > 0 && (
                                <div className="level-node__crowns">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <span
                                            key={n}
                                            className={`level-node__crown ${n <= crownLevel ? 'level-node__crown--earned' : ''}`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Connector line to next */}
                        {index < displayUnits.length - 1 && (
                            <div className={`level-node__connector ${status === 'completed' || status === 'in-progress' ? 'level-node__connector--active' : ''}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Compact Level Indicator - Shows current level in header
 */
export function LevelIndicator({ currentLevel, totalLevels, pathName }) {
    return (
        <div className="level-indicator">
            <div className="level-indicator__path">{pathName}</div>
            <div className="level-indicator__progress">
                <span className="level-indicator__current">Level {currentLevel}</span>
                <span className="level-indicator__separator">/</span>
                <span className="level-indicator__total">{totalLevels}</span>
            </div>
            <div className="level-indicator__bar">
                <div
                    className="level-indicator__fill"
                    style={{ width: `${(currentLevel / totalLevels) * 100}%` }}
                />
            </div>
        </div>
    );
}

export default LevelMap;
