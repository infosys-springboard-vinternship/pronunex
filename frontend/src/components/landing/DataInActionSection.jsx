/**
 * Data In Action Section - Enterprise Grade
 * Glass-dark mode with back-lighting, area charts, toggle views
 */

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import './DataInActionSection.css';

const weeklyData = [
    { day: 'Mon', score: 65 },
    { day: 'Tue', score: 68 },
    { day: 'Wed', score: 72 },
    { day: 'Thu', score: 70 },
    { day: 'Fri', score: 78 },
    { day: 'Sat', score: 82 },
    { day: 'Sun', score: 85 },
];

const lifetimeData = [
    { week: 'W1', score: 45 },
    { week: 'W2', score: 52 },
    { week: 'W3', score: 58 },
    { week: 'W4', score: 63 },
    { week: 'W5', score: 68 },
    { week: 'W6', score: 74 },
    { week: 'W7', score: 79 },
    { week: 'W8', score: 85 },
];

const focusPhonemes = [
    { phoneme: '/r/', score: 45, label: 'Needs Practice' },
    { phoneme: '/th/', score: 72, label: 'Improving' },
    { phoneme: '/l/', score: 88, label: 'Strong' },
    { phoneme: '/z/', score: 55, label: 'Focus Area' },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip-enterprise">
                <p className="tooltip-label">{label}</p>
                <p className="tooltip-value">{payload[0].value}%</p>
            </div>
        );
    }
    return null;
};

export default function DataInActionSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });
    const [activeView, setActiveView] = useState('weekly');

    const chartData = activeView === 'weekly' ? weeklyData : lifetimeData;
    const xKey = activeView === 'weekly' ? 'day' : 'week';

    return (
        <section className="data-section-enterprise" id="dashboard" ref={ref}>
            {/* Back-lighting glow */}
            <div className="data-backlight" aria-hidden="true" />

            <div className="section-container-enterprise">
                <motion.div
                    className="section-header-enterprise section-header-dark"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="section-label-enterprise section-label-dark">
                        Analytics
                    </span>
                    <h2 className="section-title-enterprise section-title-dark">
                        Data in Action
                    </h2>
                    <p className="section-description-enterprise section-description-dark">
                        Detailed metrics at your fingertips. Track every attempt and celebrate
                        every milestone.
                    </p>
                </motion.div>

                <motion.div
                    className="dashboard-grid-enterprise"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {/* Progress Chart Card */}
                    <div className="dashboard-card-enterprise">
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title-enterprise">Progress Overview</h3>
                            <div className="view-toggle-enterprise">
                                <button
                                    className={`toggle-btn ${activeView === 'weekly' ? 'active' : ''}`}
                                    onClick={() => setActiveView('weekly')}
                                >
                                    Weekly
                                </button>
                                <button
                                    className={`toggle-btn ${activeView === 'lifetime' ? 'active' : ''}`}
                                    onClick={() => setActiveView('lifetime')}
                                >
                                    Lifetime
                                </button>
                            </div>
                        </div>
                        <div className="chart-container-enterprise">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeView}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ width: '100%', height: '100%' }}
                                >
                                    <ResponsiveContainer width="100%" height={200}>
                                        <AreaChart
                                            data={chartData}
                                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient
                                                    id="colorScore"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="#10b981"
                                                        stopOpacity={0.4}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="#10b981"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey={xKey}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorScore)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Focus Phonemes Card */}
                    <div className="dashboard-card-enterprise">
                        <h3 className="dashboard-card-title-enterprise">Focus Phonemes</h3>
                        <div className="phoneme-list-enterprise">
                            {focusPhonemes.map((item, index) => (
                                <motion.div
                                    key={item.phoneme}
                                    className="phoneme-item-enterprise"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={
                                        isInView
                                            ? { opacity: 1, x: 0 }
                                            : { opacity: 0, x: -20 }
                                    }
                                    transition={{ delay: 0.4 + index * 0.1 }}
                                >
                                    <div className="phoneme-info-enterprise">
                                        <span className="phoneme-symbol-enterprise">
                                            {item.phoneme}
                                        </span>
                                        <span className="phoneme-label-enterprise">
                                            {item.label}
                                        </span>
                                    </div>
                                    <div className="phoneme-progress-wrapper-enterprise">
                                        <div className="phoneme-progress-bar-enterprise">
                                            <motion.div
                                                className="phoneme-progress-fill-enterprise"
                                                initial={{ width: 0 }}
                                                animate={
                                                    isInView
                                                        ? { width: `${item.score}%` }
                                                        : { width: 0 }
                                                }
                                                transition={{
                                                    delay: 0.6 + index * 0.1,
                                                    duration: 0.8,
                                                    ease: 'easeOut',
                                                }}
                                            />
                                        </div>
                                        <span className="phoneme-score-enterprise">
                                            {item.score}%
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
