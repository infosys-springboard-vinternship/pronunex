/**
 * AnimatedAreaChart Component
 * Wrapper for Recharts AreaChart with animated path drawing
 */

import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: { duration: 1.5, ease: 'easeInOut' },
            opacity: { duration: 0.5 }
        }
    }
};

export function AnimatedAreaChart({ data, xKey, chartKey = 'chart' }) {
    return (
        <motion.div
            key={chartKey}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ width: '100%', height: '100%' }}
        >
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                    data={data}
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
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
}

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

export default AnimatedAreaChart;
