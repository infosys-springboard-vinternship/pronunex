import { useState, useEffect } from 'react';
import { Check, Lock, Trophy, Target, ArrowRight } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ENDPOINTS } from '../../api/endpoints';
import { Spinner } from '../Loader';
import './SublevelSelector.css';

const ROMAN_NUMERALS = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
    '5': 'V'
};

function SublevelSelector({ level, onSelectSublevel, onBack }) {
    const [selected, setSelected] = useState('1');
    
    const { data: progressData, isLoading } = useApi(
        `${ENDPOINTS.PRACTICE.SUBLEVEL_PROGRESS}?level=${level}`,
        { enabled: !!level }
    );

    const sublevels = progressData?.sublevels || [];
    const levelName = level.charAt(0).toUpperCase() + level.slice(1);

    const getSublevelData = (sublevelNum) => {
        const progress = sublevels.find(s => s.sublevel === sublevelNum);
        return progress || {
            sublevel: sublevelNum,
            completed: false,
            completion_percent: 0,
            best_score: 0,
            attempt_count: 0
        };
    };

    const handleStart = () => {
        if (onSelectSublevel) {
            onSelectSublevel(selected);
        }
    };

    if (isLoading) {
        return (
            <div className="sublevel-selector">
                <Spinner size="lg" />
                <p>Loading progress...</p>
            </div>
        );
    }

    return (
        <div className="sublevel-selector">
            <div className="sublevel-selector__header">
                <h1 className="sublevel-selector__title">Choose Your Sublevel</h1>
                <p className="sublevel-selector__subtitle">
                    Pronunex {levelName} - Select a sublevel to practice
                </p>
            </div>

            <div className="sublevel-selector__cards">
                {['1', '2'].map((sublevelNum) => {
                    const sublevelData = getSublevelData(sublevelNum);
                    const isSelected = selected === sublevelNum;
                    const isCompleted = sublevelData.completed;
                    const bestScore = sublevelData.best_score || 0;
                    const attemptCount = sublevelData.attempt_count || 0;

                    return (
                        <button
                            key={sublevelNum}
                            type="button"
                            className={`sublevel-selector__card ${isSelected ? 'sublevel-selector__card--selected' : ''} ${isCompleted ? 'sublevel-selector__card--completed' : ''}`}
                            onClick={() => setSelected(sublevelNum)}
                            aria-pressed={isSelected}
                        >
                            <div className="sublevel-selector__check">
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

                            <div className="sublevel-selector__icon-ring">
                                {isCompleted ? <Trophy size={28} /> : <Target size={28} />}
                            </div>

                            <div className="sublevel-selector__card-text">
                                <h3 className="sublevel-selector__card-title">{levelName} {ROMAN_NUMERALS[sublevelNum]}</h3>
                                <p className="sublevel-selector__card-desc">
                                    5 practice sentences
                                </p>
                                
                                {isCompleted && (
                                    <div className="sublevel-selector__stats">
                                        <div className="sublevel-selector__stat">
                                            <span className="sublevel-selector__stat-label">Best Score</span>
                                            <span className="sublevel-selector__stat-value">
                                                {Math.round(bestScore * 100)}%
                                            </span>
                                        </div>
                                        <div className="sublevel-selector__stat">
                                            <span className="sublevel-selector__stat-label">Attempts</span>
                                            <span className="sublevel-selector__stat-value">
                                                {attemptCount}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {!isCompleted && (
                                    <p className="sublevel-selector__card-details">Not yet attempted</p>
                                )}
                            </div>

                            {isCompleted && (
                                <div className="sublevel-selector__badge">
                                    <Check size={16} />
                                    <span>Completed</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="sublevel-selector__actions">
                {onBack && (
                    <button
                        type="button"
                        className="sublevel-selector__back-btn"
                        onClick={onBack}
                    >
                        <span>Back to Levels</span>
                    </button>
                )}
                <button
                    type="button"
                    className="sublevel-selector__start-btn"
                    onClick={handleStart}
                >
                    <span>Start Practice</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
}

export default SublevelSelector;
