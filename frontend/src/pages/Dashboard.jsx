/**
 * Dashboard Page - Two-Column Grid Layout
 * Profile sidebar + main content with today's activity, stats, and charts
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Mic,
    Target,
    Flame,
    Award,
    Sparkles,
    Trophy,
    Star,
    CheckCircle,
    Calendar,
    TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { ENDPOINTS } from '../api/endpoints';
import { Spinner } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import './Dashboard.css';
import '../components/progress/MilestonesBadges.css'; // Import badge styles
import { getAvatarById } from '../config/avatarConfig';

// Progress Ring Component
function ProgressRing({ progress, size = 100, strokeWidth = 10 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

    return (
        <div className="dashboard__goal-ring" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`}>
                <circle
                    className="dashboard__goal-ring-bg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                />
                <circle
                    className="dashboard__goal-ring-progress"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeDasharray={strokeDasharray}
                />
            </svg>
            <span className="dashboard__goal-value">{Math.round(progress)}%</span>
        </div>
    );
}

// Sparkline Component - With gradient fill
function Sparkline({ data = [], color = '#047857' }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 4;

        ctx.clearRect(0, 0, width, height);

        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;

        const points = data.map((value, index) => ({
            x: padding + (index / (data.length - 1)) * (width - padding * 2),
            y: height - padding - ((value - min) / range) * (height - padding * 2)
        }));

        // Draw gradient area fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color + '30');
        gradient.addColorStop(1, color + '05');

        ctx.beginPath();
        ctx.moveTo(points[0].x, height);
        ctx.lineTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const xMid = (points[i].x + points[i + 1].x) / 2;
            const yMid = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xMid, yMid);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.lineTo(points[points.length - 1].x, height);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw smooth line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const xMid = (points[i].x + points[i + 1].x) / 2;
            const yMid = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xMid, yMid);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
    }, [data, color]);

    return (
        <canvas
            ref={canvasRef}
            width={120}
            height={36}
            className="dashboard__stat-sparkline"
        />
    );
}

// Weekly Progress Chart Component - HiDPI Crisp Canvas Rendering
function WeeklyChart({ data = [], labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, day: '', score: 0 });

    const chartData = data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Use container's actual dimensions for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        // Set canvas buffer to match display size * DPR for sharp pixels
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const padding = { top: 20, right: 20, bottom: 32, left: 48 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const max = Math.max(...chartData, 100);
        const min = 0;

        // Draw grid lines — subtle dashed
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = Math.round(padding.top + (chartHeight / 4) * i) + 0.5;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Calculate points (snap to pixel grid for sharpness)
        const points = chartData.map((value, index) => ({
            x: Math.round(padding.left + (index / (chartData.length - 1)) * chartWidth),
            y: Math.round(padding.top + chartHeight - ((value - min) / (max - min)) * chartHeight)
        }));

        // Draw gradient area fill
        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        gradient.addColorStop(0.6, 'rgba(16, 185, 129, 0.08)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, height - padding.bottom);
        ctx.lineTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const xMid = (points[i].x + points[i + 1].x) / 2;
            const yMid = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xMid, yMid);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw main curve line — thicker stroke for clarity
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const xMid = (points[i].x + points[i + 1].x) / 2;
            const yMid = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xMid, yMid);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw data points — larger and higher contrast
        points.forEach(p => {
            // Outer ring
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#10b981';
            ctx.fill();
            // Inner dot for contrast
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = '#065f46';
            ctx.fill();
            // White ring outline
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        // Draw X-axis labels — higher contrast
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            const x = padding.left + (index / (labels.length - 1)) * chartWidth;
            ctx.fillText(label, x, height - 8);
        });

        // Draw Y-axis labels — higher contrast
        ctx.textAlign = 'right';
        ctx.font = '500 13px Inter, system-ui, sans-serif';
        for (let i = 0; i <= 4; i++) {
            const value = Math.round(min + ((max - min) / 4) * (4 - i));
            const y = padding.top + (chartHeight / 4) * i + 5;
            ctx.fillText(value + '%', padding.left - 10, y);
        }

        // Store points for tooltip detection
        canvas._chartPoints = points;
        canvas._chartData = chartData;
        canvas._chartLabels = labels;
    }, [chartData, labels]);

    const handleMouseMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas._chartPoints) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scaleX = canvas.width / (dpr * rect.width);
        const x = (e.clientX - rect.left) * scaleX;
        const points = canvas._chartPoints;

        let closestIdx = 0;
        let closestDist = Infinity;
        points.forEach((p, idx) => {
            const dist = Math.abs(p.x - x);
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = idx;
            }
        });

        if (closestDist < 40) {
            setTooltip({
                show: true,
                x: e.clientX - rect.left,
                y: points[closestIdx].y / scaleX - 14,
                day: canvas._chartLabels[closestIdx],
                score: canvas._chartData[closestIdx]
            });
        } else {
            setTooltip(prev => ({ ...prev, show: false }));
        }
    };

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, show: false }));
    };

    return (
        <div
            ref={containerRef}
            className="dashboard__chart-container"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ position: 'relative' }}
        >
            <canvas
                ref={canvasRef}
                className="dashboard__chart-canvas"
            />
            {tooltip.show && (
                <div
                    className="dashboard__chart-tooltip"
                    style={{
                        position: 'absolute',
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -100%)',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                >
                    {tooltip.day}: {tooltip.score}%
                </div>
            )}
        </div>
    );
}

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




export function Dashboard() {
    const { user } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const { data: progress, isLoading, error, refetch } = useApi(ENDPOINTS.ANALYTICS.PROGRESS);

    // Calculate milestones directly from progress data
    const milestones = useMemo(() => {
        const stats = progress || {};
        return MILESTONE_DEFINITIONS.map(milestone => {
            let currentValue = 0;

            switch (milestone.field) {
                case 'total_attempts':
                    currentValue = stats.attempt_stats?.total_attempts || stats.total_attempts || 0;
                    break;
                case 'current_streak':
                    currentValue = stats.streak?.current_streak || 0;
                    break;
                case 'overall_average_score':
                    currentValue = stats.attempt_stats?.avg_score || stats.overall_average_score || 0;
                    break;
                case 'mastered_phonemes_count':
                    currentValue = stats.current_strong_phonemes?.length || 0;
                    break;
                default:
                    currentValue = 0;
            }

            const isEarned = currentValue >= milestone.threshold;

            return {
                ...milestone,
                progress: currentValue,
                isEarned,
                isNew: false
            };
        });
    }, [progress]);

    if (isLoading) {
        return (
            <div className="dashboard-loading">
                <Spinner size="lg" />
                <p>Loading your progress...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <ErrorState
                    icon="server"
                    title="Failed to load dashboard"
                    message="We could not load your progress data. Please try again."
                    onRetry={refetch}
                />
            </div>
        );
    }

    const stats = progress || {};

    // Normalize backend response
    const normalizedStats = {
        total_attempts: stats.total_attempts || 0,
        average_score: stats.overall_average_score ?? stats.average_score ?? 0,
        streak_days: stats.streak?.current_streak ?? stats.streak_days ?? 0,
        weak_phonemes: stats.current_weak_phonemes || [],
        weak_phonemes_count: stats.current_weak_phonemes?.length ?? stats.weak_phonemes_count ?? 0,
        daily_goal_progress: stats.daily_goal_progress || 0,
        daily_goal_target: stats.daily_goal_target || 10,
        weekly_scores: stats.weekly_scores || [0, 0, 0, 0, 0, 0, 0],
        weekly_labels: stats.weekly_labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    };

    const hasNoActivity = normalizedStats.total_attempts === 0;
    const userInitials = (user?.full_name || user?.username || 'U').charAt(0).toUpperCase();
    const userName = user?.full_name || user?.username || 'User';
    // Use computed level from analytics API (performance-based), fallback to settings
    const computedLevel = stats.computed_level?.level || settings.defaultDifficulty || 'beginner';
    const userLevel = computedLevel.charAt(0).toUpperCase() + computedLevel.slice(1);

    // Level progress calculation
    const levelOrder = ['beginner', 'intermediate', 'advanced'];
    const currentLevelIdx = levelOrder.indexOf(computedLevel.toLowerCase());
    const levelProgress = currentLevelIdx >= 0 ? ((currentLevelIdx + 1) / levelOrder.length) * 100 : 33;
    const nextLevel = currentLevelIdx < levelOrder.length - 1
        ? levelOrder[currentLevelIdx + 1].charAt(0).toUpperCase() + levelOrder[currentLevelIdx + 1].slice(1)
        : null;

    // Today's stats from the daily goal data
    const todayAttempts = Math.round((normalizedStats.daily_goal_progress / 100) * normalizedStats.daily_goal_target);
    const todayBestScore = Math.round((normalizedStats.average_score || 0) * 100);

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard__header">
                <div className="dashboard__welcome">
                    <h1 className="dashboard__title">
                        Welcome back, {userName}!
                    </h1>
                    <p className="dashboard__subtitle">
                        {hasNoActivity
                            ? 'Start your first practice session to begin improving.'
                            : 'Continue your journey to better pronunciation.'}
                    </p>
                </div>
                <Link to="/practice" className="dashboard__cta btn btn--primary btn--lg">
                    <Mic size={20} />
                    <span>Start Practice</span>
                </Link>
            </header>

            {/* Main Grid */}
            <div className="dashboard__grid">
                {/* Left Column - Profile & Goals */}
                <aside className="dashboard__left-column">
                    {/* Profile Card */}
                    <div className="dashboard__profile-card">
                        <Link to="/profile" className="dashboard__avatar-link">
                            <img
                                src={getAvatarById(user?.avatar_id).src}
                                alt="Profile"
                                className="dashboard__avatar-img"
                            />
                        </Link>
                        <div className="dashboard__user-info">
                            <h2 className="dashboard__user-name">{userName}</h2>
                            <span className="dashboard__user-level">{userLevel}</span>
                        </div>

                        {/* Level Progress */}
                        <div className="dashboard__level-progress">
                            <div className="dashboard__level-bar">
                                <div
                                    className="dashboard__level-fill"
                                    style={{ width: `${levelProgress}%` }}
                                />
                            </div>
                            <span className="dashboard__level-next">
                                {nextLevel ? `Next: ${nextLevel}` : 'Max Level'}
                            </span>
                        </div>

                        {/* Daily Goal - Horizontal Layout */}
                        <div className="dashboard__daily-goal">
                            <div className="dashboard__goal-stat">
                                <span className="dashboard__goal-stat-value">{todayAttempts}</span>
                                <span className="dashboard__goal-stat-label">Attempts Today</span>
                            </div>
                            <div className="dashboard__goal-center">
                                <ProgressRing progress={normalizedStats.daily_goal_progress} size={70} strokeWidth={7} />
                                <span className="dashboard__goal-label">Daily Goal</span>
                            </div>
                            <div className="dashboard__goal-stat">
                                <span className="dashboard__goal-stat-value">{Math.max(0, normalizedStats.daily_goal_target - todayAttempts)}</span>
                                <span className="dashboard__goal-stat-label">Remaining</span>
                            </div>
                        </div>
                    </div>

                    {/* Achievements */}
                    <div className="dashboard__achievements">
                        <h3 className="dashboard__section-title">Recent Badges</h3>
                        <div className="dashboard__badges" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                            gap: '1rem',
                            marginTop: '0.5rem'
                        }}>
                            {milestones.map(milestone => (
                                <MilestoneBadge
                                    key={milestone.id}
                                    milestone={milestone}
                                    progress={milestone.progress}
                                    isEarned={milestone.isEarned}
                                />
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Center Column - Stats & Charts */}
                <main className="dashboard__center-column">
                    {/* Today's Activity Card */}
                    <div className="dashboard__today-card">
                        <div className="dashboard__today-item">
                            <Calendar size={18} className="dashboard__today-icon" />
                            <div className="dashboard__today-info">
                                <span className="dashboard__today-value">{todayAttempts}</span>
                                <span className="dashboard__today-label">attempts today</span>
                            </div>
                        </div>
                        <div className="dashboard__today-divider" />
                        <div className="dashboard__today-item">
                            <TrendingUp size={18} className="dashboard__today-icon" />
                            <div className="dashboard__today-info">
                                <span className="dashboard__today-value">{todayBestScore}%</span>
                                <span className="dashboard__today-label">avg score</span>
                            </div>
                        </div>
                        <div className="dashboard__today-divider" />
                        <div className="dashboard__today-item">
                            <Flame size={18} className="dashboard__today-icon dashboard__today-icon--streak" />
                            <div className="dashboard__today-info">
                                <span className="dashboard__today-value">{normalizedStats.streak_days}</span>
                                <span className="dashboard__today-label">day streak</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="dashboard__stats-grid">
                        <div className="dashboard__stat-card">
                            <div className="dashboard__stat-header">
                                <span className="dashboard__stat-label">Total Attempts</span>
                                <div className="dashboard__stat-icon">
                                    <Target size={18} />
                                </div>
                            </div>
                            <span className="dashboard__stat-value">{normalizedStats.total_attempts}</span>
                            <Sparkline data={[5, 8, 12, 15, 18, 22, 25]} color="#10b981" />
                        </div>

                        <div className="dashboard__stat-card">
                            <div className="dashboard__stat-header">
                                <span className="dashboard__stat-label">Average Score</span>
                                <div className="dashboard__stat-icon">
                                    <Award size={18} />
                                </div>
                            </div>
                            <span className="dashboard__stat-value">
                                {Math.round(normalizedStats.average_score * 100)}%
                            </span>
                            <Sparkline data={normalizedStats.weekly_scores} color="#10b981" />
                        </div>

                        <div className="dashboard__stat-card">
                            <div className="dashboard__stat-header">
                                <span className="dashboard__stat-label">Daily Goal</span>
                                <div className="dashboard__stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                                    <Target size={18} />
                                </div>
                            </div>
                            <span className="dashboard__stat-value">{Math.round(normalizedStats.daily_goal_progress)}%</span>
                            <Sparkline data={[10, 20, 35, 50, 45, 60, normalizedStats.daily_goal_progress]} color="#d97706" />
                        </div>

                        <div className="dashboard__stat-card">
                            <div className="dashboard__stat-header">
                                <span className="dashboard__stat-label">Focus Areas</span>
                                <div className="dashboard__stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                                    <Flame size={18} />
                                </div>
                            </div>
                            <span className="dashboard__stat-value">{normalizedStats.weak_phonemes_count}</span>
                        </div>
                    </div>

                    {/* Weekly Progress Chart */}
                    <div className="dashboard__chart-card">
                        <div className="dashboard__chart-header">
                            <h3 className="dashboard__chart-title">Weekly Progress</h3>
                            <span className="dashboard__chart-period">Last 7 days</span>
                        </div>
                        <WeeklyChart data={normalizedStats.weekly_scores} labels={normalizedStats.weekly_labels} />
                    </div>

                    {/* AI Insight */}
                    <div className="dashboard__ai-insight">
                        <div className="dashboard__ai-icon">
                            <Sparkles size={22} />
                        </div>
                        <div className="dashboard__ai-content">
                            <h4 className="dashboard__ai-label">AI Insight</h4>
                            <p className="dashboard__ai-text">
                                You're doing great with vowels! Try focusing on the "th" and "r" sounds today.
                                Practice with tongue twisters for faster improvement.
                            </p>
                        </div>
                    </div>
                </main>

                {/* Bottom Section - 2x2 Grid */}
                <section className="dashboard__bottom-section" style={{
                    gridColumn: '1 / -1',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1.5rem',
                    marginTop: '0.5rem'
                }}>
                    <SessionHistory />
                    <RecommendedSentences />
                    <PhonemeMastery />
                    <PracticeTimeChart />
                </section>

            </div>
        </div>
    );
}

// Bottom section components
import { SessionHistory } from '../components/dashboard/bottom/SessionHistory';
import { RecommendedSentences } from '../components/dashboard/bottom/RecommendedSentences';
import { PhonemeMastery } from '../components/dashboard/bottom/PhonemeMastery';
import { PracticeTimeChart } from '../components/dashboard/bottom/PracticeTimeChart';

export default Dashboard;
