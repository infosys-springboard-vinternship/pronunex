/**
 * Stats Grid Component
 * Displays key metrics with animated counters and sparklines
 */

import { useState, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import './StatsGrid.css';

// Sparkline Component
function Sparkline({ data = [], color = '#14b8a6', height = 36 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width;
        const h = canvas.height;
        const padding = 4;

        // Enable crisp rendering
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, h);

        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;

        // Round coordinates to nearest pixel for crisp rendering
        const points = data.map((value, index) => ({
            x: Math.round(padding + (index / (data.length - 1)) * (width - padding * 2)),
            y: Math.round(h - padding - ((value - min) / range) * (h - padding * 2))
        }));

        // Gradient fill with better visibility
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, color + '50');
        gradient.addColorStop(1, color + '10');

        // Draw filled area with monotone (Catmull-Rom) interpolation
        ctx.beginPath();
        ctx.moveTo(points[0].x, h);
        ctx.lineTo(points[0].x, points[0].y);

        // Use Catmull-Rom spline for smooth monotone curves
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }

        ctx.lineTo(points[points.length - 1].x, h);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw stroke line with same interpolation
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, [data, color, height]);

    return (
        <canvas
            ref={canvasRef}
            width={120}
            height={height}
            className="stats-grid__sparkline"
        />
    );
}

// Interactive Mini Bar Chart Component (7-day practice minutes)
function MiniBarChart({ data = [], color = '#14b8a6', height = 36 }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const [hoveredIdx, setHoveredIdx] = useState(-1);
    const [animProgress, setAnimProgress] = useState(0);
    const [tooltip, setTooltipState] = useState({ show: false, x: 0, y: 0, value: 0, day: '' });
    const barRectsRef = useRef([]);

    const dayLabels = (() => {
        const labels = [];
        const today = new Date();
        for (let i = data.length - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d));
        }
        return labels;
    })();

    // Animate bars on mount
    useEffect(() => {
        let start = null;
        const duration = 500;
        const animate = (ts) => {
            if (!start) start = ts;
            const elapsed = ts - start;
            const progress = Math.min(elapsed / duration, 1);
            setAnimProgress(1 - Math.pow(1 - progress, 3));
            if (progress < 1) animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [data.length]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || data.length === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const width = Math.round(rect.width);
        const h = Math.round(rect.height);

        canvas.width = width * dpr;
        canvas.height = h * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = h + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, h);

        const max = Math.max(...data, 1);
        const padding = 2;
        const barGap = 3;
        const barWidth = Math.floor((width - padding * 2 - barGap * (data.length - 1)) / data.length);
        const rects = [];

        data.forEach((value, index) => {
            const fullBarH = (value / max) * (h - padding * 2);
            const barH = fullBarH * animProgress;
            const x = padding + index * (barWidth + barGap);
            const y = h - padding - barH;
            const isHovered = index === hoveredIdx;

            rects.push({ x, y: h - padding - fullBarH, w: barWidth, h: fullBarH, idx: index });

            if (value > 0) {
                if (isHovered) {
                    ctx.save();
                    ctx.shadowColor = color + '80';
                    ctx.shadowBlur = 8;
                }

                const gradient = ctx.createLinearGradient(0, y, 0, h);
                gradient.addColorStop(0, isHovered ? '#34d399' : color);
                gradient.addColorStop(1, isHovered ? color : color + '60');

                const r = Math.min(3, barWidth / 2);
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + barWidth - r, y);
                ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
                ctx.lineTo(x + barWidth, h - padding);
                ctx.lineTo(x, h - padding);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                if (isHovered) ctx.restore();
            } else {
                ctx.fillStyle = color + '20';
                ctx.fillRect(x, h - padding - 2, barWidth, 2);
            }
        });

        barRectsRef.current = rects;
    }, [data, color, height, hoveredIdx, animProgress]);

    const handleMouseMove = (e) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;

        let found = -1;
        for (const bar of barRectsRef.current) {
            if (mx >= bar.x - 2 && mx <= bar.x + bar.w + 2) {
                found = bar.idx;
                break;
            }
        }

        if (found >= 0) {
            const bar = barRectsRef.current[found];
            setHoveredIdx(found);
            setTooltipState({
                show: true,
                x: bar.x + bar.w / 2,
                y: Math.max(bar.y - 6, 0),
                value: data[found],
                day: dayLabels[found] || '',
            });
        } else {
            setHoveredIdx(-1);
            setTooltipState(prev => ({ ...prev, show: false }));
        }
    };

    const handleMouseLeave = () => {
        setHoveredIdx(-1);
        setTooltipState(prev => ({ ...prev, show: false }));
    };

    return (
        <div
            ref={containerRef}
            className="stats-grid__mini-chart-wrapper"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ position: 'relative', width: '100%', height: height, cursor: hoveredIdx >= 0 ? 'pointer' : 'default' }}
        >
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            {tooltip.show && (
                <div
                    className="stats-grid__mini-tooltip"
                    style={{ left: tooltip.x, top: tooltip.y }}
                >
                    {dayLabels[hoveredIdx]}: {Math.round(tooltip.value)}m
                </div>
            )}
        </div>
    );
}

// Streak Milestone Component
function StreakMilestone({ current, milestone = 7, color = '#f59e0b' }) {
    const progress = Math.min((current / milestone) * 100, 100);

    return (
        <div className="stats-grid__milestone">
            <div className="stats-grid__milestone-header">
                <span className="stats-grid__milestone-label">Next: {milestone} days</span>
            </div>
            <div className="stats-grid__milestone-bar">
                <div
                    className="stats-grid__milestone-fill"
                    style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`
                    }}
                />
            </div>
            <div className="stats-grid__milestone-footer">
                <span className="stats-grid__milestone-count">{current}/{milestone} days</span>
                {current > 0 && <span className="stats-grid__milestone-emoji">🔥</span>}
            </div>
        </div>
    );
}

// Stats Card Component
function StatsCard({
    icon: Icon,
    label,
    value,
    sparkData,
    trend,
    color = '#14b8a6',
    gradient,
    suffix = '',
    prefix = '',
    animated = true,
    customVisualization // NEW: Allow custom visualization component
}) {
    const trendClass = trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';

    return (
        <div className={`stats-card gradient-${gradient}`}>
            <div className="stats-card__header">
                <span className="stats-card__label">{label}</span>
                <div className="stats-card__icon">
                    <Icon size={18} />
                </div>
            </div>
            <span className="stats-card__value">
                {animated ? (
                    <AnimatedCounter
                        value={typeof value === 'string' ? parseFloat(value) : value}
                        suffix={suffix}
                        prefix={prefix}
                    />
                ) : (
                    `${prefix}${value}${suffix}`
                )}
            </span>
            {customVisualization || (
                <Sparkline
                    data={sparkData && sparkData.length >= 2
                        ? sparkData
                        : sparkData && sparkData.length === 1
                            ? [sparkData[0] * 0.8, sparkData[0]] // Show progression from 80% to current
                            : [0, 0] // Flat baseline for no data
                    }
                    color={color}
                />
            )}
            {trend !== undefined && trend !== null && (
                <div className={`stats-card__trend stats-card__trend--${trendClass}`}>
                    {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>+{Math.abs(trend)}%</span>
                </div>
            )}
            <div className="stats-card-glow" aria-hidden="true" />
            <div className="stats-card-border-glow" aria-hidden="true" />
        </div>
    );
}

// Main Stats Grid Component
export function StatsGrid({ stats, sparklineData, trend, sessionHistory = [] }) {
    const CHART_COLORS = {
        primary: '#14b8a6',
        success: '#10b981',
        neutral: '#64748b',
        warning: '#f59e0b',
    };

    // Build date-aligned 7-day practice minutes array
    const practiceMinutesData = (() => {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push({ date: d.toISOString().split('T')[0], minutes: 0 });
        }
        sessionHistory.forEach(s => {
            const match = days.find(d => d.date === s.date);
            if (match) match.minutes = s.duration || 0;
        });
        return days.map(d => d.minutes);
    })();

    // Calculate next streak milestone
    const currentStreak = stats.streak.current_streak || 0;
    const nextMilestone = currentStreak < 7 ? 7 : currentStreak < 14 ? 14 : currentStreak < 30 ? 30 : currentStreak + 10;

    return (
        <section className="stats-grid">
            <StatsCard
                icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v18h18" />
                        <path d="M18 17V9" />
                        <path d="M13 17V5" />
                        <path d="M8 17v-3" />
                    </svg>
                )}
                label="Total Attempts"
                value={stats.totalAttempts}
                sparkData={sparklineData}
                color={CHART_COLORS.primary}
                gradient="teal"
            />
            <StatsCard
                icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                )}
                label="Average Score"
                value={Math.round(stats.averageScore * 100)}
                suffix="%"
                sparkData={sparklineData}
                trend={trend?.direction === 'up' ? trend.value : trend?.direction === 'down' ? -trend.value : 0}
                color={CHART_COLORS.success}
                gradient="emerald"
            />
            <StatsCard
                icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                )}
                label="Practice Time"
                value={Math.round(stats.practiceMinutes)}
                suffix="m"
                color={CHART_COLORS.neutral}
                gradient="slate"
                customVisualization={
                    <MiniBarChart
                        data={practiceMinutesData.length > 0
                            ? practiceMinutesData
                            : [0, 0, 0, 0, 0, 0, 0] // 7 days of zero data as fallback
                        }
                        color={CHART_COLORS.neutral}
                    />
                }
            />
            <StatsCard
                icon={() => (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                )}
                label="Current Streak"
                value={currentStreak}
                suffix=" days"
                color={CHART_COLORS.warning}
                gradient="amber"
                customVisualization={
                    <StreakMilestone
                        current={currentStreak}
                        milestone={nextMilestone}
                        color={CHART_COLORS.warning}
                    />
                }
            />
        </section>
    );
}

export default StatsGrid;
