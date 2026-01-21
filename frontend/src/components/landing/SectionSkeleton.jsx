/**
 * Section Skeleton Component
 * Lightweight loading placeholder for lazy-loaded sections
 */

import './SectionSkeleton.css';

export default function SectionSkeleton({ type = 'default', height = '400px' }) {
    return (
        <div className="section-skeleton" style={{ minHeight: height }}>
            <div className="skeleton-container">
                {type === 'hero' && (
                    <div className="skeleton-hero">
                        <div className="skeleton-badge shimmer"></div>
                        <div className="skeleton-headline shimmer"></div>
                        <div className="skeleton-subtext shimmer"></div>
                        <div className="skeleton-subtext short shimmer"></div>
                        <div className="skeleton-buttons">
                            <div className="skeleton-btn primary shimmer"></div>
                            <div className="skeleton-btn secondary shimmer"></div>
                        </div>
                    </div>
                )}

                {type === 'cards' && (
                    <div className="skeleton-cards">
                        <div className="skeleton-section-header">
                            <div className="skeleton-label shimmer"></div>
                            <div className="skeleton-title shimmer"></div>
                            <div className="skeleton-desc shimmer"></div>
                        </div>
                        <div className="skeleton-grid">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="skeleton-card shimmer"></div>
                            ))}
                        </div>
                    </div>
                )}

                {type === 'steps' && (
                    <div className="skeleton-steps">
                        <div className="skeleton-section-header">
                            <div className="skeleton-label shimmer"></div>
                            <div className="skeleton-title shimmer"></div>
                        </div>
                        <div className="skeleton-step-grid">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton-step shimmer"></div>
                            ))}
                        </div>
                    </div>
                )}

                {type === 'data' && (
                    <div className="skeleton-data">
                        <div className="skeleton-section-header light">
                            <div className="skeleton-label shimmer"></div>
                            <div className="skeleton-title shimmer"></div>
                        </div>
                        <div className="skeleton-charts">
                            <div className="skeleton-chart shimmer"></div>
                            <div className="skeleton-chart shimmer"></div>
                        </div>
                    </div>
                )}

                {type === 'default' && (
                    <div className="skeleton-default">
                        <div className="skeleton-section-header">
                            <div className="skeleton-label shimmer"></div>
                            <div className="skeleton-title shimmer"></div>
                            <div className="skeleton-desc shimmer"></div>
                        </div>
                        <div className="skeleton-content shimmer"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
