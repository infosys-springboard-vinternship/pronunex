/**
 * Floating Reward Animations
 * XP, Gems, and other rewards that float up after practice
 */

import { useEffect, useState } from 'react';
import { Zap, Gem, Flame, Star, Trophy } from 'lucide-react';
import './RewardAnimations.css';

export function XPFloatingText({ amount, onComplete }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onComplete?.();
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!visible) return null;

    return (
        <div className="floating-reward floating-reward--xp">
            <Zap size={20} />
            <span>+{amount} XP</span>
        </div>
    );
}

export function GemFloatingText({ amount, onComplete }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onComplete?.();
        }, 1800);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!visible) return null;

    return (
        <div className="floating-reward floating-reward--gems">
            <Gem size={20} />
            <span>+{amount}</span>
        </div>
    );
}

export function StreakBonus({ days, onComplete }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onComplete?.();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!visible) return null;

    return (
        <div className="floating-reward floating-reward--streak">
            <Flame size={20} />
            <span>{days} Day Streak!</span>
        </div>
    );
}

/**
 * Reward Popup - Shows after practice completion
 */
export function RewardPopup({ rewards, onClose }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (rewards) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                onClose?.();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [rewards, onClose]);

    if (!rewards || !isVisible) return null;

    const { xp_earned, gems_earned, level_up, new_level, quests_completed, achievements_unlocked } = rewards;

    return (
        <div className="reward-popup">
            <div className="reward-popup__content">
                {/* XP Earned */}
                <div className="reward-popup__row reward-popup__row--xp">
                    <Zap size={24} />
                    <span className="reward-popup__label">XP Earned</span>
                    <span className="reward-popup__value">+{xp_earned}</span>
                </div>

                {/* Gems Earned */}
                {gems_earned > 0 && (
                    <div className="reward-popup__row reward-popup__row--gems">
                        <Gem size={24} />
                        <span className="reward-popup__label">Gems</span>
                        <span className="reward-popup__value">+{gems_earned}</span>
                    </div>
                )}

                {/* Level Up */}
                {level_up && (
                    <div className="reward-popup__row reward-popup__row--level">
                        <Star size={24} />
                        <span className="reward-popup__label">Level Up!</span>
                        <span className="reward-popup__value">Level {new_level}</span>
                    </div>
                )}

                {/* Quests Completed */}
                {quests_completed?.length > 0 && (
                    <div className="reward-popup__row reward-popup__row--quest">
                        <Trophy size={24} />
                        <span className="reward-popup__label">Quest Complete</span>
                        <span className="reward-popup__value">{quests_completed[0]}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Floating Rewards Container - Manages multiple floating rewards
 */
export function FloatingRewardsContainer({ rewards, position = 'center' }) {
    const [floatingItems, setFloatingItems] = useState([]);

    useEffect(() => {
        if (!rewards) return;

        const items = [];
        let delay = 0;

        if (rewards.xp_earned > 0) {
            items.push({ id: 'xp', type: 'xp', amount: rewards.xp_earned, delay });
            delay += 300;
        }

        if (rewards.gems_earned > 0) {
            items.push({ id: 'gems', type: 'gems', amount: rewards.gems_earned, delay });
            delay += 300;
        }

        if (rewards.level_up) {
            items.push({ id: 'level', type: 'level', amount: rewards.new_level, delay });
        }

        setFloatingItems(items);
    }, [rewards]);

    const handleComplete = (id) => {
        setFloatingItems(prev => prev.filter(item => item.id !== id));
    };

    return (
        <div className={`floating-rewards-container floating-rewards-container--${position}`}>
            {floatingItems.map(item => (
                <div
                    key={item.id}
                    className="floating-reward-wrapper"
                    style={{ animationDelay: `${item.delay}ms` }}
                >
                    {item.type === 'xp' && (
                        <XPFloatingText
                            amount={item.amount}
                            onComplete={() => handleComplete(item.id)}
                        />
                    )}
                    {item.type === 'gems' && (
                        <GemFloatingText
                            amount={item.amount}
                            onComplete={() => handleComplete(item.id)}
                        />
                    )}
                    {item.type === 'level' && (
                        <div className="floating-reward floating-reward--level">
                            <Star size={20} />
                            <span>Level {item.amount}!</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default { XPFloatingText, GemFloatingText, RewardPopup, FloatingRewardsContainer };
