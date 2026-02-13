import { Trophy, Target, TrendingUp, RotateCcw, ArrowRight } from 'lucide-react';
import './SublevelSummary.css';

const ROMAN_NUMERALS = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
    '5': 'V'
};

function SublevelSummary({ 
    level, 
    sublevel, 
    averageScore, 
    weakPhonemes = [], 
    strongestPhoneme = null,
    totalAttempts = 5,
    onRetry, 
    onNext 
}) {
    const scorePercent = Math.round(averageScore * 100);
    const isGoodScore = averageScore >= 0.7;
    const isExcellentScore = averageScore >= 0.85;
    const levelName = level.charAt(0).toUpperCase() + level.slice(1);
    const sublevelRoman = ROMAN_NUMERALS[sublevel] || sublevel;

    return (
        <div className="sublevel-summary">
            <div className="sublevel-summary__container">
                <div className="sublevel-summary__header">
                    {isExcellentScore && (
                        <div className="sublevel-summary__trophy">
                            <Trophy size={64} />
                        </div>
                    )}
                    <h1 className="sublevel-summary__title">
                        {isExcellentScore ? 'Excellent Work!' : isGoodScore ? 'Great Job!' : 'Keep Practicing!'}
                    </h1>
                    <p className="sublevel-summary__subtitle">
                        You completed Pronunex {levelName} {sublevelRoman}
                    </p>
                </div>

                <div className="sublevel-summary__score-card">
                    <div className="sublevel-summary__score-ring">
                        <svg viewBox="0 0 200 200">
                            <circle
                                className="sublevel-summary__score-ring-bg"
                                cx="100"
                                cy="100"
                                r="85"
                            />
                            <circle
                                className={`sublevel-summary__score-ring-progress ${isGoodScore ? 'sublevel-summary__score-ring-progress--good' : 'sublevel-summary__score-ring-progress--needs-work'}`}
                                cx="100"
                                cy="100"
                                r="85"
                                strokeDasharray={`${averageScore * 534.07} 534.07`}
                            />
                        </svg>
                        <div className="sublevel-summary__score-value">
                            <span className="sublevel-summary__score-number">{scorePercent}</span>
                            <span className="sublevel-summary__score-unit">%</span>
                        </div>
                    </div>
                    <p className="sublevel-summary__score-label">Average Score</p>
                </div>

                <div className="sublevel-summary__stats">
                    <div className="sublevel-summary__stat-card">
                        <div className="sublevel-summary__stat-icon sublevel-summary__stat-icon--target">
                            <Target size={24} />
                        </div>
                        <div className="sublevel-summary__stat-content">
                            <span className="sublevel-summary__stat-label">Sentences Completed</span>
                            <span className="sublevel-summary__stat-value">{totalAttempts} / 5</span>
                        </div>
                    </div>

                    {strongestPhoneme && (
                        <div className="sublevel-summary__stat-card">
                            <div className="sublevel-summary__stat-icon sublevel-summary__stat-icon--success">
                                <TrendingUp size={24} />
                            </div>
                            <div className="sublevel-summary__stat-content">
                                <span className="sublevel-summary__stat-label">Strongest Sound</span>
                                <span className="sublevel-summary__stat-value">/{strongestPhoneme}/</span>
                            </div>
                        </div>
                    )}

                    {weakPhonemes.length > 0 && (
                        <div className="sublevel-summary__weak-phonemes">
                            <h3 className="sublevel-summary__weak-title">Focus Areas</h3>
                            <div className="sublevel-summary__weak-list">
                                {weakPhonemes.slice(0, 5).map((phoneme, idx) => (
                                    <span key={idx} className="sublevel-summary__weak-badge">
                                        /{phoneme}/
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="sublevel-summary__actions">
                    {onRetry && (
                        <button
                            type="button"
                            className="sublevel-summary__btn sublevel-summary__btn--retry"
                            onClick={onRetry}
                        >
                            <RotateCcw size={20} />
                            <span>Retry Sublevel</span>
                        </button>
                    )}
                    {onNext && (
                        <button
                            type="button"
                            className="sublevel-summary__btn sublevel-summary__btn--next"
                            onClick={onNext}
                        >
                            <span>Next Sublevel</span>
                            <ArrowRight size={20} />
                        </button>
                    )}
                </div>

                {isExcellentScore && (
                    <div className="sublevel-summary__encouragement">
                        Outstanding performance! You're mastering pronunciation. 
                    </div>
                )}
                {isGoodScore && !isExcellentScore && (
                    <div className="sublevel-summary__encouragement">
                        Good progress! Keep practicing to refine your skills.
                    </div>
                )}
                {!isGoodScore && (
                    <div className="sublevel-summary__encouragement">
                        Don't give up! Practice makes perfect. Try again to improve.
                    </div>
                )}
            </div>
        </div>
    );
}

export default SublevelSummary;
