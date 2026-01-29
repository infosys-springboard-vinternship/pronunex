/**
 * Period Selector Component
 * Reusable toggle for selecting time periods (7/30/90 days)
 */

import { PROGRESS_CONFIG } from './progressConfig';
import './PeriodSelector.css';

export function PeriodSelector({ value, onChange }) {
    return (
        <div className="period-selector">
            {PROGRESS_CONFIG.periods.map(p => (
                <button
                    key={p.key}
                    className={`period-selector__btn ${value === p.key ? 'period-selector__btn--active' : ''}`}
                    onClick={() => onChange(p.key)}
                    aria-pressed={value === p.key}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}

export default PeriodSelector;
