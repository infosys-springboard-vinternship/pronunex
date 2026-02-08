import { Gem, Heart } from 'lucide-react';
import './Currency.css';

export function CurrencyDisplay({ gems = 0, hearts = 5, maxHearts = 5, showLabels = true }) {
    return (
        <div className="currency-display">
            <div className="currency-display__item currency-display__item--gems">
                <Gem className="currency-display__icon" size={20} />
                <span className="currency-display__value">{gems}</span>
                {showLabels && <span className="currency-display__label">Gems</span>}
            </div>
            
            <div className="currency-display__item currency-display__item--hearts">
                <Heart 
                    className="currency-display__icon" 
                    size={20}
                    fill={hearts > 0 ? 'currentColor' : 'none'}
                />
                <span className="currency-display__value">{hearts}/{maxHearts}</span>
                {showLabels && <span className="currency-display__label">Hearts</span>}
            </div>
        </div>
    );
}

export function GemsCounter({ gems = 0, size = 'medium' }) {
    return (
        <div className={`gems-counter gems-counter--${size}`}>
            <Gem className="gems-counter__icon" />
            <span className="gems-counter__value">{gems}</span>
        </div>
    );
}

export function HeartsDisplay({ hearts = 5, maxHearts = 5, size = 'medium' }) {
    return (
        <div className={`hearts-display hearts-display--${size}`}>
            {Array.from({ length: maxHearts }).map((_, index) => (
                <Heart
                    key={index}
                    className={`hearts-display__heart ${
                        index < hearts ? 'hearts-display__heart--full' : 'hearts-display__heart--empty'
                    }`}
                    size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
                    fill={index < hearts ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );
}
