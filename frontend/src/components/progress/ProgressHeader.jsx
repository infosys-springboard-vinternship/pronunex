/**
 * Progress Header Component
 * Displays page title, subtitle, and trend indicator
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './ProgressHeader.css';

export function ProgressHeader({ trend }) {
    return (
        <header className="progress-header">
            <div className="progress-header__content">
                <h1 className="progress-header__title">Your Progress</h1>
                <p className="progress-header__subtitle">
                    Track your pronunciation improvement journey
                </p>
            </div>
            {trend && (
                <div className={`progress-header__trend progress-header__trend--${trend.direction}`}>
                    {trend.direction === 'up' && <TrendingUp size={20} />}
                    {trend.direction === 'down' && <TrendingDown size={20} />}
                    {trend.direction === 'neutral' && <Minus size={20} />}
                    <span>
                        {trend.direction === 'up' && `+${trend.value}% this week`}
                        {trend.direction === 'down' && `-${trend.value}% this week`}
                        {trend.direction === 'neutral' && 'No change this week'}
                    </span>
                </div>
            )}
        </header>
    );
}

export default ProgressHeader;
