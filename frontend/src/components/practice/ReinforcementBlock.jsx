/**
 * ReinforcementBlock - Post-sublevel weak phoneme recommendations
 * 
 * Displays aggregated weak phonemes from a sublevel session and
 * recommends targeted sentences for additional practice.
 */

import React from 'react';
import { Target, BookOpen, ArrowRight, RefreshCw } from 'lucide-react';
import './ReinforcementBlock.css';

function ReinforcementBlock({ weakPhonemes, recommendedSentences, onPracticeSet, onSkip }) {
    if (!weakPhonemes || weakPhonemes.length === 0) return null;

    const hasRecommendations = recommendedSentences && recommendedSentences.length > 0;

    return (
        <div className="reinforce">
            {/* Header */}
            <div className="reinforce__header">
                <div className="reinforce__header-icon">
                    <Target size={20} />
                </div>
                <div>
                    <h3 className="reinforce__title">Targeted Reinforcement</h3>
                    <p className="reinforce__subtitle">
                        Based on your sublevel performance, these phonemes need more practice
                    </p>
                </div>
            </div>

            {/* Weak Phonemes Summary */}
            <div className="reinforce__phonemes">
                <span className="reinforce__phonemes-label">Weak Areas:</span>
                <div className="reinforce__phonemes-list">
                    {weakPhonemes.map((wp, idx) => (
                        <div key={idx} className="reinforce__phoneme-chip">
                            <span className="reinforce__phoneme-symbol">/{wp.symbol}/</span>
                            <span className="reinforce__phoneme-score">
                                {Math.round(wp.avg_score * 100)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recommended Sentences */}
            {hasRecommendations ? (
                <div className="reinforce__sentences">
                    <div className="reinforce__sentences-label">
                        <BookOpen size={14} />
                        <span>Recommended Practice Sentences</span>
                    </div>
                    <ul className="reinforce__sentence-list">
                        {recommendedSentences.map((sentence, idx) => (
                            <li key={sentence.id} className="reinforce__sentence-item">
                                <span className="reinforce__sentence-number">{idx + 1}</span>
                                <div className="reinforce__sentence-content">
                                    <p className="reinforce__sentence-text">{sentence.text}</p>
                                    <div className="reinforce__sentence-tags">
                                        <span className={`reinforce__difficulty reinforce__difficulty--${sentence.difficulty_level}`}>
                                            {sentence.difficulty_level}
                                        </span>
                                        {sentence.target_phonemes?.map((p, pIdx) => (
                                            <span key={pIdx} className="reinforce__target-tag">/{p}/</span>
                                        ))}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="reinforce__empty">
                    <p className="reinforce__empty-text">
                        No targeted practice sentences available right now. Try revisiting this sublevel later for personalized recommendations.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="reinforce__actions">
                <button className="reinforce__btn reinforce__btn--secondary" onClick={onSkip}>
                    <span>Skip</span>
                    <ArrowRight size={16} />
                </button>
                {hasRecommendations && onPracticeSet && (
                    <button className="reinforce__btn reinforce__btn--primary" onClick={onPracticeSet}>
                        <RefreshCw size={16} />
                        <span>Practice Weak Set</span>
                    </button>
                )}
            </div>
        </div>
    );
}

export default ReinforcementBlock;
