import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import { ENDPOINTS } from '../../../api/endpoints';
import { Spinner } from '../../Loader';
import './PracticeTimeChart.css';

export function PracticeTimeChart() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const [hoveredIdx, setHoveredIdx] = useState(-1);
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, minutes: 0, day: '', date: '' });
    const [animProgress, setAnimProgress] = useState(0);
    const barRectsRef = useRef([]);
    const { data: history, isLoading } = useApi(`${ENDPOINTS.ANALYTICS.HISTORY}?days=7`);

    // Process history into last 7 days of practice minutes
    const chartData = (() => {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push({
                date: d.toISOString().split('T')[0],
                label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d),
                fullDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d),
                minutes: 0,
            });
        }

        if (history) {
            const historyArray = Array.isArray(history) ? history : (history.results || history.data || []);
            if (Array.isArray(historyArray)) {
                historyArray.forEach(item => {
                    const dateStr = item.date;
                    const match = days.find(d => d.date === dateStr);
                    if (match) {
                        match.minutes = item.total_practice_minutes || item.duration || 0;
                    }
                });
            }
        }

        return days;
    })();

    const maxMinutes = Math.max(...chartData.map(d => d.minutes), 1);
    const totalMinutes = chartData.reduce((sum, d) => sum + d.minutes, 0);
    const avgMinutes = Math.round(totalMinutes / 7);

    // Animate bars on mount
    useEffect(() => {
        let start = null;
        const duration = 600;
        const animate = (ts) => {
            if (!start) start = ts;
            const elapsed = ts - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimProgress(eased);
            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            }
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [chartData.length]);

    // Draw the chart
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const padding = { top: 14, right: 12, bottom: 30, left: 12 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const barCount = chartData.length;
        const barGap = Math.max(8, chartWidth * 0.04);
        const barWidth = (chartWidth - barGap * (barCount - 1)) / barCount;
        const radius = Math.min(6, barWidth / 2);

        const rects = [];

        chartData.forEach((item, idx) => {
            const x = padding.left + idx * (barWidth + barGap);
            const fullBarHeight = maxMinutes > 0 ? (item.minutes / maxMinutes) * chartHeight : 0;
            const barHeight = fullBarHeight * animProgress;
            const y = padding.top + chartHeight - barHeight;
            const isHovered = idx === hoveredIdx;

            // Store bar rects for hit testing
            rects.push({ x, y: padding.top + chartHeight - fullBarHeight, w: barWidth, h: fullBarHeight, idx });

            if (barHeight > 0) {
                // Shadow glow on hover
                if (isHovered) {
                    ctx.save();
                    ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
                    ctx.shadowBlur = 16;
                    ctx.shadowOffsetY = 4;
                }

                // Bar gradient — brighter on hover
                const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
                if (isHovered) {
                    gradient.addColorStop(0, '#34d399');
                    gradient.addColorStop(1, '#10b981');
                } else {
                    gradient.addColorStop(0, '#10b981');
                    gradient.addColorStop(1, '#047857');
                }

                // Draw rounded bar
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + barWidth - radius, y);
                ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
                ctx.lineTo(x + barWidth, padding.top + chartHeight);
                ctx.lineTo(x, padding.top + chartHeight);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                if (isHovered) {
                    ctx.restore();
                }

                // Value on top — bold on hover
                ctx.fillStyle = isHovered ? '#34d399' : '#94a3b8';
                ctx.font = isHovered ? 'bold 12px Inter, system-ui, sans-serif' : '500 10px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${Math.round(item.minutes)}m`, x + barWidth / 2, y - 6);
            } else {
                // Empty bar placeholder — subtle dash
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                const dashY = padding.top + chartHeight;
                ctx.beginPath();
                ctx.moveTo(x + 4, dashY);
                ctx.lineTo(x + barWidth - 4, dashY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Day label — highlighted on hover
            ctx.fillStyle = isHovered ? '#f1f5f9' : '#64748b';
            ctx.font = isHovered ? 'bold 12px Inter, system-ui, sans-serif' : '500 11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, x + barWidth / 2, height - 8);
        });

        barRectsRef.current = rects;
    }, [chartData, maxMinutes, hoveredIdx, animProgress]);

    // Mouse interaction handler
    const handleMouseMove = useCallback((e) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let found = -1;
        for (const bar of barRectsRef.current) {
            // Expand hit area slightly for easier targeting
            if (mouseX >= bar.x - 4 && mouseX <= bar.x + bar.w + 4 &&
                mouseY >= 0 && mouseY <= rect.height) {
                found = bar.idx;
                break;
            }
        }

        if (found >= 0) {
            const bar = barRectsRef.current[found];
            const item = chartData[found];
            setHoveredIdx(found);
            setTooltip({
                show: true,
                x: bar.x + bar.w / 2,
                y: Math.max(bar.y - 16, 10),
                minutes: item.minutes,
                day: item.label,
                date: item.fullDate,
            });
        } else {
            setHoveredIdx(-1);
            setTooltip(prev => ({ ...prev, show: false }));
        }
    }, [chartData]);

    const handleMouseLeave = useCallback(() => {
        setHoveredIdx(-1);
        setTooltip(prev => ({ ...prev, show: false }));
    }, []);

    if (isLoading) {
        return (
            <div className="practice-time-chart">
                <Spinner size="sm" />
            </div>
        );
    }

    return (
        <div className="practice-time-chart">
            <header className="practice-time-chart__header">
                <h3 className="practice-time-chart__title">
                    <Clock size={18} />
                    Practice Time
                </h3>
                <div className="practice-time-chart__meta">
                    <span className="practice-time-chart__total">
                        {Math.round(totalMinutes)} min this week
                    </span>
                    <span className="practice-time-chart__avg">
                        ~{avgMinutes}m / day
                    </span>
                </div>
            </header>
            <div
                ref={containerRef}
                className="practice-time-chart__canvas-wrapper"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: hoveredIdx >= 0 ? 'pointer' : 'default' }}
            >
                <canvas ref={canvasRef} className="practice-time-chart__canvas" />
                {tooltip.show && (
                    <div
                        className="practice-time-chart__tooltip"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y,
                        }}
                    >
                        <span className="practice-time-chart__tooltip-day">{tooltip.date}</span>
                        <span className="practice-time-chart__tooltip-value">{Math.round(tooltip.minutes)} min</span>
                    </div>
                )}
            </div>
        </div>
    );
}
