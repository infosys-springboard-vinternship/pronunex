/**
 * Session History Card Component
 * Displays recent practice sessions with scores and duration
 */

import { Calendar } from 'lucide-react';
import './SessionHistoryCard.css';

function SessionHistoryItem({ date, score, attempts, duration }) {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
    const scorePercent = Math.round((score || 0) * 100);
    const scoreClass = scorePercent >= 80 ? 'excellent' : scorePercent >= 60 ? 'good' : 'needs-work';

    return (
        <div className="session-history__item">
            <div className="session-history__date">
                <Calendar size={16} aria-hidden="true" />
                <span>{formattedDate}</span>
            </div>
            <div className="session-history__details">
                <span
                    className={`session-history__score session-history__score--${scoreClass}`}
                    aria-label={`Score: ${scorePercent} percent`}
                >
                    {scorePercent}%
                </span>
                <span className="session-history__attempts">{attempts} attempts</span>
                {duration > 0 && (
                    <span className="session-history__duration">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {Math.round(duration)}m
                    </span>
                )}
            </div>
        </div>
    );
}

export function SessionHistoryCard({ sessions = [], period, maxItems = 7 }) {
    return (
        <div className="session-history">
            <div className="session-history__header">
                <h2 className="session-history__title">Recent Sessions</h2>
                <span className="session-history__subtitle">Last {period} days</span>
            </div>
            <div className="session-history__list" role="list">
                {sessions.length > 0 ? (
                    sessions.slice(0, maxItems).map((session, idx) => (
                        <SessionHistoryItem
                            key={session.date || idx}
                            date={session.date}
                            score={session.score}
                            attempts={session.attempts}
                            duration={session.duration}
                        />
                    ))
                ) : (
                    <p className="session-history__no-data">No sessions recorded yet.</p>
                )}
            </div>
        </div>
    );
}

export default SessionHistoryCard;
