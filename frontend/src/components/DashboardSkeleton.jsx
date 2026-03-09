/**
 * DashboardSkeleton — Shimmer-animated placeholder
 * Matches the real Dashboard layout: header, 2-column grid, bottom grid
 */

import './DashboardSkeleton.css';

function Bone({ w, h, r, style }) {
    return (
        <div
            className="skel__bone"
            style={{
                width: w || '100%',
                height: h || '16px',
                borderRadius: r || '8px',
                ...style,
            }}
        />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="dashboard-skeleton">
            {/* Header */}
            <div className="skel__header">
                <div className="skel__header-text">
                    <Bone w="200px" h="28px" />
                    <Bone w="320px" h="14px" style={{ marginTop: '10px' }} />
                </div>
                <Bone w="160px" h="44px" r="12px" />
            </div>

            {/* Main Grid */}
            <div className="skel__grid">
                {/* Left Column — Profile + Badges */}
                <aside className="skel__left">
                    <div className="skel__card skel__profile">
                        <Bone w="64px" h="64px" r="50%" style={{ margin: '0 auto' }} />
                        <Bone w="120px" h="18px" style={{ margin: '12px auto 0' }} />
                        <Bone w="80px" h="12px" style={{ margin: '6px auto 0' }} />
                        <Bone w="100%" h="8px" r="4px" style={{ marginTop: '16px' }} />
                        <div className="skel__daily-goal">
                            <div className="skel__goal-item">
                                <Bone w="32px" h="24px" />
                                <Bone w="60px" h="10px" />
                            </div>
                            <Bone w="70px" h="70px" r="50%" />
                            <div className="skel__goal-item">
                                <Bone w="32px" h="24px" />
                                <Bone w="60px" h="10px" />
                            </div>
                        </div>
                    </div>
                    <div className="skel__card skel__badges">
                        <Bone w="120px" h="16px" />
                        <div className="skel__badge-grid">
                            {[...Array(4)].map((_, i) => (
                                <Bone key={i} w="60px" h="60px" r="12px" />
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Center Column — Stats + Chart */}
                <main className="skel__center">
                    {/* Today strip */}
                    <div className="skel__card skel__today">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="skel__today-item">
                                <Bone w="18px" h="18px" r="4px" />
                                <Bone w="36px" h="22px" />
                                <Bone w="70px" h="10px" />
                            </div>
                        ))}
                    </div>

                    {/* Stats grid */}
                    <div className="skel__stats-grid">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="skel__card skel__stat">
                                <div className="skel__stat-head">
                                    <Bone w="90px" h="12px" />
                                    <Bone w="32px" h="32px" r="8px" />
                                </div>
                                <Bone w="60px" h="28px" style={{ marginTop: '8px' }} />
                                <Bone w="100%" h="24px" r="4px" style={{ marginTop: '8px' }} />
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    <div className="skel__card skel__chart">
                        <div className="skel__chart-head">
                            <Bone w="130px" h="16px" />
                            <Bone w="80px" h="12px" />
                        </div>
                        <Bone w="100%" h="160px" r="8px" style={{ marginTop: '16px' }} />
                    </div>

                    {/* AI Insight */}
                    <div className="skel__card skel__insight">
                        <Bone w="36px" h="36px" r="10px" />
                        <div style={{ flex: 1 }}>
                            <Bone w="80px" h="14px" />
                            <Bone w="100%" h="12px" style={{ marginTop: '8px' }} />
                            <Bone w="75%" h="12px" style={{ marginTop: '4px' }} />
                        </div>
                    </div>
                </main>

                {/* Bottom 2x2 */}
                <section className="skel__bottom">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skel__card skel__bottom-card">
                            <div className="skel__bottom-head">
                                <Bone w="18px" h="18px" r="4px" />
                                <Bone w="120px" h="14px" />
                            </div>
                            <Bone w="100%" h="80px" r="8px" style={{ marginTop: '12px' }} />
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}
