/**
 * Path Selector - Choose difficulty track
 * Sound Explorer (Beginner) → Fluency Adventurer → Pronunciation Champion
 */

import { useState, useEffect } from 'react';
import { Lock, Check, Star, Flame, Target, Award } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ENDPOINTS } from '../../api/endpoints';
import './PathSelector.css';

const PATH_ICONS = {
    'beginner': Target,
    'intermediate': Flame,
    'advanced': Award
};

const PATH_COLORS = {
    'beginner': '#10b981',
    'intermediate': '#f59e0b',
    'advanced': '#ec4899'
};

export function PathSelector({ selectedPath, onSelectPath, userProgress }) {
    const { data: pathsData, isLoading, error } = useApi(ENDPOINTS.LEARNING_PATHS.LIST);
    const paths = pathsData || [];

    const isPathUnlocked = (path) => {
        if (path.difficulty === 'beginner') return true;
        if (!userProgress) return false;

        // Check unlock criteria
        const avgAccuracy = userProgress.average_accuracy || 0;
        const previousPathComplete = path.unlock_criteria_previous_path
            ? userProgress.completed_paths?.includes(path.unlock_criteria_previous_path)
            : true;

        return avgAccuracy >= (path.unlock_criteria_accuracy || 0) || previousPathComplete;
    };

    const getPathProgress = (path) => {
        if (!userProgress?.path_progress) return 0;
        return userProgress.path_progress[path.id] || 0;
    };

    if (isLoading) {
        return (
            <div className="path-selector path-selector--loading">
                <div className="path-selector__skeleton" />
                <div className="path-selector__skeleton" />
                <div className="path-selector__skeleton" />
            </div>
        );
    }

    if (error || paths.length === 0) {
        // Fallback to default paths
        const defaultPaths = [
            { id: 1, name: 'Sound Explorer', difficulty: 'beginner', description: 'Start with basic sounds' },
            { id: 2, name: 'Fluency Adventurer', difficulty: 'intermediate', description: 'Master tricky phonemes' },
            { id: 3, name: 'Pronunciation Champion', difficulty: 'advanced', description: 'Natural fluency' }
        ];

        return (
            <div className="path-selector">
                {defaultPaths.map((path, index) => {
                    const Icon = PATH_ICONS[path.difficulty];
                    const isUnlocked = index === 0;
                    const isSelected = selectedPath?.id === path.id;

                    return (
                        <button
                            key={path.id}
                            className={`path-card ${isSelected ? 'path-card--selected' : ''} ${!isUnlocked ? 'path-card--locked' : ''}`}
                            onClick={() => isUnlocked && onSelectPath(path)}
                            disabled={!isUnlocked}
                            style={{ '--path-color': PATH_COLORS[path.difficulty] }}
                        >
                            <div className="path-card__icon">
                                {isUnlocked ? <Icon size={24} /> : <Lock size={24} />}
                            </div>
                            <div className="path-card__content">
                                <h3 className="path-card__name">{path.name}</h3>
                                <p className="path-card__description">{path.description}</p>
                            </div>
                            {!isUnlocked && (
                                <div className="path-card__unlock-hint">
                                    Complete previous path to unlock
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="path-selector">
            {paths.map((path) => {
                const Icon = PATH_ICONS[path.difficulty] || Target;
                const isUnlocked = isPathUnlocked(path);
                const isSelected = selectedPath?.id === path.id;
                const progress = getPathProgress(path);

                return (
                    <button
                        key={path.id}
                        className={`path-card ${isSelected ? 'path-card--selected' : ''} ${!isUnlocked ? 'path-card--locked' : ''}`}
                        onClick={() => isUnlocked && onSelectPath(path)}
                        disabled={!isUnlocked}
                        style={{ '--path-color': PATH_COLORS[path.difficulty] }}
                    >
                        <div className="path-card__icon">
                            {isUnlocked ? <Icon size={24} /> : <Lock size={24} />}
                        </div>
                        <div className="path-card__content">
                            <h3 className="path-card__name">{path.name}</h3>
                            <p className="path-card__description">{path.description}</p>
                            {isUnlocked && progress > 0 && (
                                <div className="path-card__progress">
                                    <div
                                        className="path-card__progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                        {isSelected && <Check size={20} className="path-card__check" />}
                        {!isUnlocked && (
                            <div className="path-card__unlock-hint">
                                {path.unlock_criteria_accuracy}% accuracy required
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default PathSelector;
