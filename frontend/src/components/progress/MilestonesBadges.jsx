/**
 * Milestones Badges Component
 * Displays earned achievement badges and progress toward upcoming milestones
 */

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Star, Flame, Target, Award, Zap, CheckCircle, Crown, Gem, Timer, Shield, Medal } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ENDPOINTS } from '../../api/endpoints';
import './MilestonesBadges.css';

// Milestone definitions with icons and thresholds
const MILESTONE_DEFINITIONS = [
    // --- Attempt-based milestones ---
    {
        id: 'first_practice',
        name: 'First Steps',
        description: 'Complete your first practice session',
        icon: Star,
        threshold: 1,
        field: 'total_attempts',
        color: '#f59e0b',
        category: 'attempts',
    },
    {
        id: 'attempts_50',
        name: 'Dedicated Learner',
        description: 'Complete 50 practice attempts',
        icon: Target,
        threshold: 50,
        field: 'total_attempts',
        color: '#10b981',
        category: 'attempts',
    },
    {
        id: 'attempts_100',
        name: 'Century Club',
        description: 'Complete 100 practice attempts',
        icon: Trophy,
        threshold: 100,
        field: 'total_attempts',
        color: '#14b8a6',
        category: 'attempts',
    },
    {
        id: 'attempts_250',
        name: 'Persistent Pro',
        description: 'Complete 250 practice attempts',
        icon: Medal,
        threshold: 250,
        field: 'total_attempts',
        color: '#a855f7',
        category: 'attempts',
    },
    {
        id: 'attempts_500',
        name: 'Half Thousand',
        description: 'Complete 500 practice attempts',
        icon: Gem,
        threshold: 500,
        field: 'total_attempts',
        color: '#06b6d4',
        category: 'attempts',
    },
    {
        id: 'attempts_1000',
        name: 'Grand Master',
        description: 'Complete 1,000 practice attempts',
        icon: Crown,
        threshold: 1000,
        field: 'total_attempts',
        color: '#eab308',
        category: 'attempts',
    },
    // --- Streak-based milestones ---
    {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Achieve a 7-day practice streak',
        icon: Flame,
        threshold: 7,
        field: 'current_streak',
        color: '#ef4444',
        category: 'consistency',
    },
    {
        id: 'streak_14',
        name: 'Fortnight Force',
        description: 'Achieve a 14-day practice streak',
        icon: Shield,
        threshold: 14,
        field: 'current_streak',
        color: '#f97316',
        category: 'consistency',
    },
    {
        id: 'streak_30',
        name: 'Monthly Legend',
        description: 'Achieve a 30-day practice streak',
        icon: Crown,
        threshold: 30,
        field: 'current_streak',
        color: '#dc2626',
        category: 'consistency',
    },
    // --- Score-based milestones ---
    {
        id: 'score_80',
        name: 'High Achiever',
        description: 'Reach 80% average pronunciation score',
        icon: Award,
        threshold: 0.80,
        field: 'overall_average_score',
        color: '#8b5cf6',
        category: 'accuracy',
    },
    {
        id: 'score_90',
        name: 'Pronunciation Elite',
        description: 'Reach 90% average pronunciation score',
        icon: Gem,
        threshold: 0.90,
        field: 'overall_average_score',
        color: '#d946ef',
        category: 'accuracy',
    },
    // --- Mastery-based milestones ---
    {
        id: 'phonemes_mastered_5',
        name: 'Sound Master',
        description: 'Master 5 different phonemes',
        icon: Zap,
        threshold: 5,
        field: 'mastered_phonemes_count',
        color: '#ec4899',
        category: 'mastery',
    },
    {
        id: 'phonemes_mastered_10',
        name: 'Phoneme Virtuoso',
        description: 'Master 10 different phonemes',
        icon: Star,
        threshold: 10,
        field: 'mastered_phonemes_count',
        color: '#f43f5e',
        category: 'mastery',
    },
    // --- Practice time milestones ---
    {
        id: 'practice_500_min',
        name: 'Time Investor',
        description: 'Spend 500 minutes practicing',
        icon: Timer,
        threshold: 500,
        field: 'total_practice_minutes',
        color: '#0ea5e9',
        category: 'dedication',
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
                case 'total_practice_minutes':
                    currentValue = progressData.total_practice_minutes || 0;
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
    // Sort: earned first, then by progress descending
    const sortedMilestones = [...milestones].sort((a, b) => {
        if (a.isEarned && !b.isEarned) return -1;
        if (!a.isEarned && b.isEarned) return 1;
        return (b.progress / b.threshold) - (a.progress / a.threshold);
    });
    const displayMilestones = showAll ? sortedMilestones : sortedMilestones.slice(0, 8);

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

            {sortedMilestones.length > 8 && (
                <button
                    className="milestones__toggle-btn"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Show Less' : `Show All ${sortedMilestones.length} Achievements`}
                </button>
            )}
        </div>
    );
}

export default MilestonesBadges;
