import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import './PhonemeMastery.css';

export function PhonemeMastery({ dashboardData }) {
    const navigate = useNavigate();

    // Derive phoneme data from parent's dashboard data (phoneme_progress)
    const phonemeData = (() => {
        const progressArr = dashboardData?.phoneme_progress;
        if (Array.isArray(progressArr) && progressArr.length > 0) {
            return progressArr.map(item => ({
                phoneme: item.phoneme?.arpabet || item.phoneme || item.phoneme_arpabet || '',
                score: item.current_score ?? item.score ?? 0,
            }));
        }
        // Fallback if no data
        return [
            { phoneme: 'th', score: 0 },
            { phoneme: 'r', score: 0 },
            { phoneme: 'l', score: 0 },
            { phoneme: 'ae', score: 0 },
        ];
    })();

    const getScoreColor = (score) => {
        if (score >= 0.8) return '#10b981'; // Success
        if (score >= 0.5) return '#f59e0b'; // Warning
        return '#ef4444'; // Danger
    };

    return (
        <div className="phoneme-mastery">
            <header className="phoneme-mastery__header">
                <h3 className="phoneme-mastery__title">
                    <BookOpen size={18} />
                    Phoneme Mastery
                </h3>
                <div className="phoneme-mastery__legend">
                    <div className="phoneme-mastery__legend-item">
                        <span className="phoneme-mastery__dot bg-success"></span> Strong
                    </div>
                    <div className="phoneme-mastery__legend-item">
                        <span className="phoneme-mastery__dot bg-warning"></span> Average
                    </div>
                    <div className="phoneme-mastery__legend-item">
                        <span className="phoneme-mastery__dot bg-danger"></span> Weak
                    </div>
                </div>
            </header>

            <div className="phoneme-mastery__grid">
                {phonemeData.slice(0, 8).map((item, idx) => (
                    <div
                        key={idx}
                        className="phoneme-mastery__item"
                        onClick={() => navigate(`/phonemes/${item.phoneme}`)}
                    >
                        <span className="phoneme-mastery__symbol">/{item.phoneme}/</span>
                        <div className="phoneme-mastery__bar">
                            <div
                                className="phoneme-mastery__fill"
                                style={{
                                    width: `${item.score * 100}%`,
                                    background: getScoreColor(item.score)
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
