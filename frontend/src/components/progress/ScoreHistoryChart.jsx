/**
 * Score History Chart Component
 * Area chart displaying pronunciation score trends over time
 */

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PROGRESS_CONFIG } from './progressConfig';
import { PeriodSelector } from './PeriodSelector';
import './ScoreHistoryChart.css';

// Custom Tooltip - kept inline as per user preference
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="score-chart__tooltip">
            <p className="score-chart__tooltip-label">{label}</p>
            {payload.map((entry, index) => (
                <p key={index} className="score-chart__tooltip-value" style={{ color: entry.color }}>
                    {entry.name}: {entry.value}%
                </p>
            ))}
        </div>
    );
}

export function ScoreHistoryChart({ data = [], period, onPeriodChange }) {
    const { colors } = PROGRESS_CONFIG;

    return (
        <div className="score-chart">
            <div className="score-chart__header">
                <h2 className="score-chart__title">Score History</h2>
                <PeriodSelector value={period} onChange={onPeriodChange} />
            </div>
            <div className="score-chart__container">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border-primary)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            stroke="var(--text-tertiary)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="var(--text-tertiary)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="score"
                            name="Score"
                            stroke={colors.primary}
                            strokeWidth={2}
                            fill="url(#scoreGradient)"
                            animationDuration={800}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default ScoreHistoryChart;
