/**
 * WeakPhonemeModal - Immediate feedback modal for weak phonemes
 * 
 * Shows articulation tips and practice words when weak phonemes 
 * are detected in a sentence assessment.
 */

import React from 'react';
import { X, AlertTriangle, BookOpen, Volume2 } from 'lucide-react';
import './WeakPhonemeModal.css';

function WeakPhonemeModal({ weakPhonemeDetails, onClose, onPractice }) {
    if (!weakPhonemeDetails || weakPhonemeDetails.length === 0) return null;

    return (
        <div className="wpm-overlay" onClick={onClose}>
            <div className="wpm-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <header className="wpm-header">
                    <div className="wpm-header__icon">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="wpm-header__text">
                        <h3 className="wpm-header__title">Phonemes to Focus On</h3>
                        <p className="wpm-header__subtitle">
                            {weakPhonemeDetails.length} phoneme{weakPhonemeDetails.length > 1 ? 's' : ''} need{weakPhonemeDetails.length === 1 ? 's' : ''} attention
                        </p>
                    </div>
                    <button className="wpm-close" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </header>

                {/* Phoneme Cards */}
                <div className="wpm-body">
                    {weakPhonemeDetails.map((detail, idx) => (
                        <div key={idx} className="wpm-card">
                            <div className="wpm-card__top">
                                <div className="wpm-card__phoneme">
                                    <span className="wpm-card__symbol">/{detail.symbol}/</span>
                                    <span className="wpm-card__arpabet">{detail.arpabet}</span>
                                </div>
                                <div className="wpm-card__score">
                                    <div
                                        className="wpm-card__score-bar"
                                        style={{ '--score-width': `${Math.round(detail.average_score * 100)}%` }}
                                    />
                                    <span className="wpm-card__score-text">
                                        {Math.round(detail.average_score * 100)}%
                                    </span>
                                </div>
                            </div>

                            {/* Articulation Tip */}
                            {detail.articulation_tip && (
                                <div className="wpm-card__tip">
                                    <BookOpen size={14} className="wpm-card__tip-icon" />
                                    <p>{detail.articulation_tip}</p>
                                </div>
                            )}

                            {/* Practice Words */}
                            {detail.practice_words?.length > 0 && (
                                <div className="wpm-card__words">
                                    <span className="wpm-card__words-label">
                                        <Volume2 size={12} />
                                        Practice words:
                                    </span>
                                    <div className="wpm-card__words-list">
                                        {detail.practice_words.map((word, wIdx) => (
                                            <span key={wIdx} className="wpm-card__word-tag">{word}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <footer className="wpm-footer">
                    <button className="wpm-footer__btn wpm-footer__btn--secondary" onClick={onClose}>
                        Continue
                    </button>
                    {onPractice && (
                        <button className="wpm-footer__btn wpm-footer__btn--primary" onClick={onPractice}>
                            Practice These Phonemes
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}

export default WeakPhonemeModal;
