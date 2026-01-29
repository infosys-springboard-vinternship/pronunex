/**
 * Milestones Badges Component
 * Displays earned achievement badges and progress toward upcoming milestones
 */

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Star, Flame, Target, Award, Zap, CheckCircle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ENDPOINTS } from '../../api/endpoints';
import './MilestonesBadges.css';

// Milestone definitions with icons and thresholds
const MILESTONE_DEFINITIONS = [
    {
        id: 'first_practice',
        name: 'First Steps',
        description: 'Complete your first practice session',
        icon: Star,
        threshold: 1,
        field: 'total_attempts',
        color: '#f59e0b'
    },
    {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Achieve a 7-day practice streak',
        icon: Flame,
        threshold: 7,
        field: 'current_streak',
        color: '#ef4444'
    },
    {
        id: 'attempts_50',
        name: 'Dedicated Learner',
        description: 'Complete 50 practice attempts',
        icon: Target,
        threshold: 50,
        field: 'total_attempts',
        color: '#10b981'
    },
    {
        id: 'attempts_100',
        name: 'Century Club',
        description: 'Complete 100 practice attempts',
        icon: Trophy,
        threshold: 100,
        field: 'total_attempts',
        color: '#14b8a6'
    },
    {
        id: 'score_80',
        name: 'High Achiever',
        description: 'Reach 80% average pronunciation score',
        icon: Award,
        threshold: 0.80,
        field: 'overall_average_score',
        color: '#8b5cf6'
    },
    {
        id: 'phonemes_mastered_5',
        name: 'Sound Master',
        description: 'Master 5 different phonemes',
        icon: Zap,
        threshold: 5,
        field: 'mastered_phonemes_count',
        color: '#ec4899'
    },
];

function MilestoneBadge({ milestone, progress, isEarned, isNew }) {
    const Icon = milestone.icon;
    const progressPercent = Math.min((progress / milestone.threshold) * 100, 100);

    return (
        <div
            className={`milestone-badge ${isEarned ? 'milestone-badge--earned' : ''} ${isNew ? 'milestone-badge--new' : ''}`}
            title={milestone.description}
        >
            <div
                className="milestone-badge__icon-wrapper"
                style={{
                    '--milestone-color': milestone.color,
                    '--progress-percent': `${progressPercent}%`
                }}
            >
                <Icon
                    size={24}
                    className="milestone-badge__icon"
                    aria-hidden="true"
                />
                {isEarned && (
                    <CheckCircle
                        size={12}
                        className="milestone-badge__check"
                        aria-hidden="true"
                    />
                )}
                {!isEarned && (
                    <svg className="milestone-badge__progress-ring" viewBox="0 0 36 36">
                        <path
                            className="milestone-badge__progress-bg"
                            d="M18 2.0845
                               a 15.9155 15.9155 0 0 1 0 31.831
                               a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                            className="milestone-badge__progress-fill"
                            strokeDasharray={`${progressPercent}, 100`}
                            d="M18 2.0845
                               a 15.9155 15.9155 0 0 1 0 31.831
                               a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                    </svg>
                )}
            </div>
            <span className="milestone-badge__name">{milestone.name}</span>
            {!isEarned && (
                <span className="milestone-badge__progress-text">
                    {Math.round(progress)}/{milestone.threshold}
                </span>
            )}
        </div>
    );
}

export function MilestonesBadges({ progressData }) {
    const [showAll, setShowAll] = useState(false);

    // Calculate milestone progress from progressData
    const milestones = useMemo(() => {
        if (!progressData) return [];

        return MILESTONE_DEFINITIONS.map(milestone => {
            let currentValue = 0;

            switch (milestone.field) {
                case 'total_attempts':
                    currentValue = progressData.total_attempts || 0;
                    break;
                case 'current_streak':
                    currentValue = progressData.streak?.current_streak || 0;
                    break;
                case 'overall_average_score':
                    currentValue = progressData.overall_average_score || 0;
                    break;
                case 'mastered_phonemes_count':
                    currentValue = progressData.current_strong_phonemes?.length || 0;
                    break;
                default:
                    currentValue = 0;
            }

            const isEarned = currentValue >= milestone.threshold;

            return {
                ...milestone,
                progress: currentValue,
                isEarned,
                isNew: false, // Could be enhanced with local storage to track newly earned
            };
        });
    }, [progressData]);

    const earnedCount = milestones.filter(m => m.isEarned).length;
    const displayMilestones = showAll ? milestones : milestones.slice(0, 4);

    return (
        <div className="milestones">
            <div className="milestones__header">
                <div>
                    <h2 className="milestones__title">
                        <Trophy size={20} aria-hidden="true" />
                        Achievements
                    </h2>
                    <p className="milestones__subtitle">
                        {earnedCount} of {milestones.length} earned
                    </p>
                </div>
            </div>

            <div className="milestones__grid">
                {displayMilestones.map(milestone => (
                    <MilestoneBadge
                        key={milestone.id}
                        milestone={milestone}
                        progress={milestone.progress}
                        isEarned={milestone.isEarned}
                        isNew={milestone.isNew}
                    />
                ))}
            </div>

            {milestones.length > 4 && (
                <button
                    className="milestones__toggle-btn"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Show Less' : `Show All ${milestones.length} Achievements`}
                </button>
            )}
        </div>
    );
}

export default MilestonesBadges;
