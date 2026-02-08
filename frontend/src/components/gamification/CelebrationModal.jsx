import { useEffect, useState } from 'react';
import { Trophy, Zap, Star, Sparkles, Award } from 'lucide-react';
import './CelebrationModal.css';

export function CelebrationModal({ show, onClose, celebration }) {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        if (show) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                handleClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show]);
    
    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            if (onClose) onClose();
        }, 300);
    };
    
    if (!show && !isVisible) return null;
    
    const getIcon = (type) => {
        switch (type) {
            case 'level_up':
                return <Zap size={64} />;
            case 'achievement':
                return <Trophy size={64} />;
            case 'quest_complete':
                return <Star size={64} />;
            default:
                return <Sparkles size={64} />;
        }
    };
    
    return (
        <div className={`celebration-modal ${isVisible ? 'celebration-modal--visible' : ''}`}>
            <div className="celebration-modal__overlay" onClick={handleClose} />
            
            <div className="celebration-modal__content">
                <div className="celebration-modal__confetti">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="celebration-modal__confetti-piece"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${2 + Math.random()}s`,
                            }}
                        />
                    ))}
                </div>
                
                <div className="celebration-modal__icon">
                    {getIcon(celebration?.type)}
                </div>
                
                <h2 className="celebration-modal__title">
                    {celebration?.title || 'Congratulations!'}
                </h2>
                
                <p className="celebration-modal__message">
                    {celebration?.message}
                </p>
                
                {celebration?.rewards && (
                    <div className="celebration-modal__rewards">
                        {celebration.rewards.xp_earned > 0 && (
                            <div className="celebration-modal__reward">
                                +{celebration.rewards.xp_earned} XP
                            </div>
                        )}
                        {celebration.rewards.gems_earned > 0 && (
                            <div className="celebration-modal__reward celebration-modal__reward--gems">
                                +{celebration.rewards.gems_earned} Gems
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function RewardToast({ reward, onComplete }) {
    const [isVisible, setIsVisible] = useState(true);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 300);
        }, 2500);
        return () => clearTimeout(timer);
    }, [onComplete]);
    
    return (
        <div className={`reward-toast ${isVisible ? 'reward-toast--visible' : ''}`}>
            <div className="reward-toast__content">
                {reward.xp_earned > 0 && (
                    <span className="reward-toast__item">
                        <Zap size={16} />
                        +{reward.xp_earned} XP
                    </span>
                )}
                {reward.gems_earned > 0 && (
                    <span className="reward-toast__item reward-toast__item--gems">
                        <Sparkles size={16} />
                        +{reward.gems_earned} Gems
                    </span>
                )}
            </div>
        </div>
    );
}

export function LevelUpAnimation({ newLevel, onComplete }) {
    const [stage, setStage] = useState(0);
    
    useEffect(() => {
        const timers = [
            setTimeout(() => setStage(1), 100),
            setTimeout(() => setStage(2), 800),
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 2000),
        ];
        
        return () => timers.forEach(t => clearTimeout(t));
    }, [onComplete]);
    
    return (
        <div className={`level-up-animation level-up-animation--stage-${stage}`}>
            <div className="level-up-animation__burst">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="level-up-animation__ray"
                        style={{
                            transform: `rotate(${i * 45}deg)`,
                        }}
                    />
                ))}
            </div>
            
            <div className="level-up-animation__content">
                <Award className="level-up-animation__icon" size={80} />
                <div className="level-up-animation__level">Level {newLevel}</div>
                <div className="level-up-animation__label">Level Up!</div>
            </div>
        </div>
    );
}
