import { useEffect, useState } from 'react';
import './XPRing.css';

export function XPRing({ xpData, size = 120 }) {
    const [animatedProgress, setAnimatedProgress] = useState(0);
    
    const progress = xpData?.progress_percentage || 0;
    const currentLevel = xpData?.current_level || 1;
    const dailyXP = xpData?.daily_xp || 0;
    const dailyGoal = xpData?.daily_xp_goal || 20;
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedProgress(progress);
        }, 100);
        return () => clearTimeout(timer);
    }, [progress]);
    
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(animatedProgress / 100) * circumference} ${circumference}`;
    
    return (
        <div className="xp-ring" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="xp-ring__svg">
                <circle
                    className="xp-ring__bg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth="10"
                />
                <circle
                    className="xp-ring__progress"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth="10"
                    strokeDasharray={strokeDasharray}
                    style={{ transition: 'stroke-dasharray 0.6s ease-in-out' }}
                />
            </svg>
            <div className="xp-ring__content">
                <div className="xp-ring__level">Level {currentLevel}</div>
                <div className="xp-ring__xp">{dailyXP}/{dailyGoal} XP</div>
            </div>
        </div>
    );
}

export function XPBar({ xpData }) {
    const [animatedProgress, setAnimatedProgress] = useState(0);
    
    const progress = xpData?.progress_percentage || 0;
    const totalXP = xpData?.total_xp || 0;
    const xpToNext = xpData?.xp_to_next_level || 100;
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedProgress(progress);
        }, 100);
        return () => clearTimeout(timer);
    }, [progress]);
    
    return (
        <div className="xp-bar">
            <div className="xp-bar__info">
                <span className="xp-bar__xp">{totalXP} XP</span>
                <span className="xp-bar__remaining">{xpToNext} to next level</span>
            </div>
            <div className="xp-bar__track">
                <div 
                    className="xp-bar__fill" 
                    style={{ 
                        width: `${animatedProgress}%`,
                        transition: 'width 0.6s ease-in-out'
                    }}
                />
            </div>
        </div>
    );
}
