/**
 * Card Component
 * Reusable card with 3D hover effects
 */

import './Card.css';

export function Card({
    children,
    variant = 'default',
    hover = true,
    padding = 'md',
    className = '',
    onClick,
    ...props
}) {
    const classes = [
        'card',
        `card--${variant}`,
        `card--padding-${padding}`,
        hover && 'card--hover',
        onClick && 'card--clickable',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const Component = onClick ? 'button' : 'div';

    return (
        <Component className={classes} onClick={onClick} {...props}>
            {children}
        </Component>
    );
}

/**
 * Card Header
 */
export function CardHeader({ children, className = '' }) {
    return <div className={`card__header ${className}`}>{children}</div>;
}

/**
 * Card Body
 */
export function CardBody({ children, className = '' }) {
    return <div className={`card__body ${className}`}>{children}</div>;
}

/**
 * Card Footer
 */
export function CardFooter({ children, className = '' }) {
    return <div className={`card__footer ${className}`}>{children}</div>;
}

/**
 * Stat Card for dashboards
 */
export function StatCard({ label, value, icon: Icon, trend, accent, className = '' }) {
    return (
        <Card className={`stat-card ${accent ? `stat-card--${accent}` : ''} ${className}`}>
            <div className="stat-card__content">
                <span className="stat-card__label">
                    {accent === 'live' && <span className="stat-card__pulse" />}
                    {label}
                </span>
                <span className="stat-card__value">{value}</span>
                {trend && (
                    <span className={`stat-card__trend stat-card__trend--${trend.direction}`}>
                        {trend.direction === 'up' ? '+' : ''}
                        {trend.value}%
                    </span>
                )}
            </div>
            {Icon && (
                <div className="stat-card__icon">
                    <Icon size={24} />
                </div>
            )}
        </Card>
    );
}

export default Card;
