/**
 * SessionProgressIndicator Component
 * Visual progress indicator shown during practice sessions.
 * Displays sentence completion, average score, and a "Change Level" action.
 */

import { BarChart3, ArrowLeft } from 'lucide-react';
import './SessionProgressIndicator.css';

function SessionProgressIndicator({
    currentIndex,
    totalSentences,
    completedCount,
    averageScore,
    currentLevel,
    onChangeLevel,
}) {
    const completionPercent = totalSentences > 0 ? (completedCount / totalSentences) * 100 : 0;

    // Build segment data for the dots
    const segments = Array.from({ length: totalSentences }, (_, i) => {
        if (i < currentIndex && completedCount > i) return 'completed';
        if (i === currentIndex) return 'current';
        return 'remaining';
    });

    const levelLabels = {
        core: 'Pronunex Core',
        edge: 'Pronunex Edge',
        elite: 'Pronunex Elite',
    };

    return (
        <div className="session-progress">
            {/* Level badge + change button */}
            <div className="session-progress__level">
                <span className={`session-progress__level-badge session-progress__level-badge--${currentLevel}`}>
                    {levelLabels[currentLevel] || currentLevel}
                </span>
                <button
                    type="button"
                    className="session-progress__change-btn"
                    onClick={onChangeLevel}
                    title="Change difficulty level"
                >
                    <ArrowLeft size={14} />
                    <span>Change Level</span>
                </button>
            </div>

            {/* Progress stats */}
            <div className="session-progress__stats">
                <div className="session-progress__stat">
                    <span className="session-progress__stat-value">{completedCount}</span>
                    <span className="session-progress__stat-sep">/</span>
                    <span className="session-progress__stat-total">{totalSentences}</span>
                    <span className="session-progress__stat-label">Completed</span>
                </div>

                {completedCount > 0 && (
                    <div className="session-progress__stat session-progress__stat--score">
                        <BarChart3 size={16} />
                        <span className="session-progress__stat-value">
                            {Math.round(averageScore * 100)}%
                        </span>
                        <span className="session-progress__stat-label">Avg Score</span>
                    </div>
                )}
            </div>

            {/* Progress dots */}
            <div className="session-progress__dots" role="progressbar" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}>
                {segments.map((status, i) => (
                    <div
                        key={i}
                        className={`session-progress__dot session-progress__dot--${status}`}
                        title={`Sentence ${i + 1}: ${status}`}
                    />
                ))}
            </div>

            {/* Completion bar */}
            <div className="session-progress__bar">
                <div
                    className="session-progress__bar-fill"
                    style={{ width: `${completionPercent}%` }}
                />
            </div>
        </div>
    );
}

export default SessionProgressIndicator;
