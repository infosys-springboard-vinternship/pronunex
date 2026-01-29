/**
 * Skeleton Loader Component
 * Loading placeholders for progress page sections
 */

import './SkeletonLoader.css';

export function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-card__header">
                <div className="skeleton skeleton--text skeleton--sm" />
                <div className="skeleton skeleton--circle" />
            </div>
            <div className="skeleton skeleton--text skeleton--lg" />
            <div className="skeleton skeleton--chart" />
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="skeleton-chart">
            <div className="skeleton-chart__header">
                <div className="skeleton skeleton--text skeleton--md" />
                <div className="skeleton skeleton--text skeleton--sm" />
            </div>
            <div className="skeleton skeleton--chart-area" />
        </div>
    );
}

export function SkeletonList({ items = 5 }) {
    return (
        <div className="skeleton-list">
            {Array.from({ length: items }).map((_, index) => (
                <div key={index} className="skeleton-list__item">
                    <div className="skeleton skeleton--text skeleton--md" />
                    <div className="skeleton skeleton--text skeleton--sm" />
                </div>
            ))}
        </div>
    );
}

export function ProgressSkeleton() {
    return (
        <div className="progress-skeleton">
            {/* Header Skeleton */}
            <div className="progress-skeleton__header">
                <div>
                    <div className="skeleton skeleton--text skeleton--xl" style={{ width: '200px' }} />
                    <div className="skeleton skeleton--text skeleton--sm" style={{ width: '300px', marginTop: '8px' }} />
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="progress-skeleton__stats">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>

            {/* Charts Skeleton */}
            <div className="progress-skeleton__charts">
                <SkeletonChart />
                <SkeletonChart />
            </div>
        </div>
    );
}

export default ProgressSkeleton;
