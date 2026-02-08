/**
 * Candy Crush Style Level Map
 * Vertical scrollable level progression with animated nodes
 */

import { useState, useRef, useEffect } from 'react';
import { Lock, Star, Play, Crown, Sparkles, Trophy } from 'lucide-react';
import './CandyCrushMap.css';

// Level node types
const NODE_TYPES = {
    LOCKED: 'locked',
    AVAILABLE: 'available',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    PERFECT: 'perfect',  // All stars earned
    BOSS: 'boss'         // Special challenge level
};

// Generate wave pattern for level positioning
const getNodePosition = (index, totalLevels) => {
    const amplitude = 80; // How far left/right nodes go
    const frequency = 0.5; // Wave frequency
    const x = Math.sin(index * frequency) * amplitude;
    return { x, y: index * 100 }; // 100px between levels
};

export function CandyCrushMap({
    levels = [],
    currentLevel = 1,
    userProgress = {},
    onSelectLevel,
    pathName = 'Sound Explorer'
}) {
    const containerRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);
    const [hoveredLevel, setHoveredLevel] = useState(null);

    // Default levels if none provided
    const displayLevels = levels.length > 0 ? levels : Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Level ${i + 1}`,
        order: i + 1,
        type: i === 14 ? 'boss' : 'normal',
        stars: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0
    }));

    const getLevelStatus = (level, index) => {
        if (userProgress?.completed_levels?.includes(level.id)) {
            const stars = userProgress?.level_stars?.[level.id] || 0;
            return stars >= 3 ? NODE_TYPES.PERFECT : NODE_TYPES.COMPLETED;
        }
        if (level.id === currentLevel) return NODE_TYPES.AVAILABLE;
        if (level.id < currentLevel) return NODE_TYPES.COMPLETED;
        if (level.id === currentLevel + 1 && index < displayLevels.length) return NODE_TYPES.AVAILABLE;
        return NODE_TYPES.LOCKED;
    };

    const getStars = (level) => {
        return userProgress?.level_stars?.[level.id] || level.stars || 0;
    };

    // Scroll to current level on mount
    useEffect(() => {
        if (containerRef.current) {
            const currentLevelIndex = displayLevels.findIndex(l => l.id === currentLevel);
            const scrollPosition = currentLevelIndex * 100 - 200; // Center it
            containerRef.current.scrollTo({ top: Math.max(0, scrollPosition), behavior: 'smooth' });
        }
    }, [currentLevel, displayLevels]);

    // Track scroll position for parallax effects
    const handleScroll = (e) => {
        setScrollY(e.target.scrollTop);
    };

    const totalHeight = displayLevels.length * 100 + 200;

    return (
        <div className="candy-map">
            {/* Path header */}
            <div className="candy-map__header">
                <h2 className="candy-map__path-name">{pathName}</h2>
                <div className="candy-map__progress">
                    <span className="candy-map__level-count">
                        Level {currentLevel} / {displayLevels.length}
                    </span>
                </div>
            </div>

            {/* Scrollable level container */}
            <div
                ref={containerRef}
                className="candy-map__scroll-container"
                onScroll={handleScroll}
            >
                <div
                    className="candy-map__levels"
                    style={{ height: `${totalHeight}px` }}
                >
                    {/* Path line SVG */}
                    <svg className="candy-map__path-svg" viewBox={`0 0 300 ${totalHeight}`}>
                        <defs>
                            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="50%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                        </defs>

                        {displayLevels.map((level, index) => {
                            if (index === displayLevels.length - 1) return null;

                            const start = getNodePosition(index, displayLevels.length);
                            const end = getNodePosition(index + 1, displayLevels.length);
                            const status = getLevelStatus(level, index);
                            const isActive = status !== NODE_TYPES.LOCKED;

                            return (
                                <path
                                    key={`path-${index}`}
                                    d={`M ${150 + start.x} ${start.y + 100} 
                                        Q ${150 + (start.x + end.x) / 2} ${start.y + 150} 
                                          ${150 + end.x} ${end.y + 100}`}
                                    className={`candy-map__path-line ${isActive ? 'candy-map__path-line--active' : ''}`}
                                    stroke={isActive ? 'url(#pathGradient)' : 'var(--border-primary)'}
                                />
                            );
                        })}
                    </svg>

                    {/* Level nodes */}
                    {displayLevels.map((level, index) => {
                        const pos = getNodePosition(index, displayLevels.length);
                        const status = getLevelStatus(level, index);
                        const stars = getStars(level);
                        const isHovered = hoveredLevel === level.id;
                        const isBoss = level.type === 'boss';

                        return (
                            <div
                                key={level.id}
                                className={`candy-node candy-node--${status} ${isBoss ? 'candy-node--boss' : ''} ${isHovered ? 'candy-node--hovered' : ''}`}
                                style={{
                                    left: `calc(50% + ${pos.x}px)`,
                                    top: `${pos.y + 80}px`,
                                    '--node-delay': `${index * 0.05}s`
                                }}
                                onMouseEnter={() => setHoveredLevel(level.id)}
                                onMouseLeave={() => setHoveredLevel(null)}
                            >
                                <button
                                    className="candy-node__button"
                                    onClick={() => status !== NODE_TYPES.LOCKED && onSelectLevel?.(level)}
                                    disabled={status === NODE_TYPES.LOCKED}
                                    aria-label={`Level ${level.order}: ${level.name}`}
                                >
                                    <span className="candy-node__number">{level.order}</span>

                                    {/* Icon overlay */}
                                    <span className="candy-node__icon">
                                        {status === NODE_TYPES.LOCKED && <Lock size={20} />}
                                        {status === NODE_TYPES.AVAILABLE && <Play size={20} />}
                                        {status === NODE_TYPES.PERFECT && <Crown size={20} />}
                                        {isBoss && status !== NODE_TYPES.LOCKED && <Trophy size={20} />}
                                    </span>

                                    {/* Pulse animation for available */}
                                    {status === NODE_TYPES.AVAILABLE && (
                                        <span className="candy-node__pulse" />
                                    )}

                                    {/* Sparkle effect for completed */}
                                    {(status === NODE_TYPES.COMPLETED || status === NODE_TYPES.PERFECT) && (
                                        <span className="candy-node__sparkle">
                                            <Sparkles size={16} />
                                        </span>
                                    )}
                                </button>

                                {/* Stars display */}
                                {stars > 0 && (
                                    <div className="candy-node__stars">
                                        {[1, 2, 3].map(n => (
                                            <Star
                                                key={n}
                                                size={14}
                                                className={`candy-node__star ${n <= stars ? 'candy-node__star--earned' : ''}`}
                                                fill={n <= stars ? '#fbbf24' : 'transparent'}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Level name tooltip */}
                                <div className="candy-node__tooltip">
                                    <span className="candy-node__tooltip-name">{level.name}</span>
                                    {status === NODE_TYPES.LOCKED && (
                                        <span className="candy-node__tooltip-hint">Complete previous level</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* End trophy */}
                    <div
                        className="candy-map__finish"
                        style={{ top: `${totalHeight - 80}px` }}
                    >
                        <Trophy size={40} />
                        <span>Master!</span>
                    </div>
                </div>
            </div>

            {/* Scroll indicators */}
            <div className="candy-map__scroll-hint candy-map__scroll-hint--top">
                <span>Scroll up</span>
            </div>
            <div className="candy-map__scroll-hint candy-map__scroll-hint--bottom">
                <span>Scroll down</span>
            </div>
        </div>
    );
}

export default CandyCrushMap;
