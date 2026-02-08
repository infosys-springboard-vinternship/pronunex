/**
 * Level Up Modal with Confetti
 * Shown when user gains a new level
 */

import { useEffect, useState, useCallback } from 'react';
import { Star, X } from 'lucide-react';
import './LevelUpModal.css';

function Confetti({ count = 50 }) {
    const pieces = Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        color: ['#10b981', '#8b5cf6', '#f97316', '#fbbf24', '#ec4899'][Math.floor(Math.random() * 5)],
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360
    }));

    return (
        <div className="confetti-container">
            {pieces.map(piece => (
                <div
                    key={piece.id}
                    className="confetti-piece"
                    style={{
                        left: `${piece.left}%`,
                        animationDelay: `${piece.delay}s`,
                        animationDuration: `${piece.duration}s`,
                        backgroundColor: piece.color,
                        width: `${piece.size}px`,
                        height: `${piece.size}px`,
                        transform: `rotate(${piece.rotation}deg)`
                    }}
                />
            ))}
        </div>
    );
}

export function LevelUpModal({ level, onClose, isOpen }) {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        setShowConfetti(false);
        onClose?.();
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="level-up-modal" onClick={handleClose}>
            {showConfetti && <Confetti count={80} />}

            <div className="level-up-modal__content" onClick={e => e.stopPropagation()}>
                <button className="level-up-modal__close" onClick={handleClose}>
                    <X size={24} />
                </button>

                <div className="level-up-modal__badge">
                    <div className="level-up-modal__glow" />
                    <div className="level-up-modal__star">
                        <Star size={60} fill="currentColor" />
                    </div>
                </div>

                <h2 className="level-up-modal__title">Level Up!</h2>
                <div className="level-up-modal__level">Level {level}</div>

                <p className="level-up-modal__message">
                    Amazing progress! Keep practicing to unlock new achievements!
                </p>

                <button className="level-up-modal__button" onClick={handleClose}>
                    Continue
                </button>
            </div>
        </div>
    );
}

export default LevelUpModal;
