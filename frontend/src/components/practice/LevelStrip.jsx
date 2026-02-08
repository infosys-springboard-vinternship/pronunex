/**
 * Compact Level Strip - Horizontal scrollable level selector
 * Small, unobtrusive, and collapsible
 */

import { useState, useRef, useEffect } from 'react';
import { Lock, Star, Play, Crown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import './LevelStrip.css';

export function LevelStrip({
    levels = [],
    currentLevel = 1,
    userProgress = {},
    onSelectLevel,
    pathName = 'Practice'
}) {
    const scrollRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Default levels if none provided
    const displayLevels = levels.length > 0 ? levels : Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        order: i + 1,
        stars: 0
    }));

    const getLevelStatus = (level) => {
        if (userProgress?.completed_levels?.includes(level.id)) return 'completed';
        if (level.order === currentLevel) return 'current';
        if (level.order < currentLevel) return 'completed';
        if (level.order === currentLevel + 1) return 'available';
        return 'locked';
    };

    const getStars = (level) => {
        return userProgress?.level_stars?.[level.id] || level.stars || 0;
    };

    // Scroll to current level on mount
    useEffect(() => {
        if (scrollRef.current) {
            const currentNode = scrollRef.current.querySelector('.level-node--current');
            if (currentNode) {
                currentNode.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [currentLevel]);

    // Update scroll arrows
    const updateScrollButtons = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        updateScrollButtons();
        const ref = scrollRef.current;
        if (ref) {
            ref.addEventListener('scroll', updateScrollButtons);
            return () => ref.removeEventListener('scroll', updateScrollButtons);
        }
    }, [displayLevels]);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = 200;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className={`level-strip ${isExpanded ? 'level-strip--expanded' : 'level-strip--collapsed'}`}>
            {/* Header with collapse toggle */}
            <div className="level-strip__header">
                <span className="level-strip__title">{pathName}</span>
                <span className="level-strip__progress">
                    Level {currentLevel} / {displayLevels.length}
                </span>
                <button
                    className="level-strip__toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* Scrollable level nodes */}
            {isExpanded && (
                <div className="level-strip__content">
                    {canScrollLeft && (
                        <button
                            className="level-strip__scroll-btn level-strip__scroll-btn--left"
                            onClick={() => scroll('left')}
                            aria-label="Scroll left"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}

                    <div className="level-strip__nodes" ref={scrollRef}>
                        {/* Connecting line */}
                        <div className="level-strip__line" />

                        {displayLevels.map((level) => {
                            const status = getLevelStatus(level);
                            const stars = getStars(level);
                            const isClickable = status !== 'locked';

                            return (
                                <button
                                    key={level.id}
                                    className={`level-node level-node--${status}`}
                                    onClick={() => isClickable && onSelectLevel?.(level)}
                                    disabled={!isClickable}
                                    aria-label={`Level ${level.order}`}
                                >
                                    <span className="level-node__circle">
                                        {status === 'locked' ? (
                                            <Lock size={14} />
                                        ) : status === 'current' ? (
                                            <Play size={14} />
                                        ) : stars >= 3 ? (
                                            <Crown size={14} />
                                        ) : (
                                            <span className="level-node__number">{level.order}</span>
                                        )}
                                    </span>

                                    {/* Stars display */}
                                    {status === 'completed' && stars > 0 && (
                                        <div className="level-node__stars">
                                            {[1, 2, 3].map(n => (
                                                <Star
                                                    key={n}
                                                    size={8}
                                                    fill={n <= stars ? '#fbbf24' : 'transparent'}
                                                    stroke="#fbbf24"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {canScrollRight && (
                        <button
                            className="level-strip__scroll-btn level-strip__scroll-btn--right"
                            onClick={() => scroll('right')}
                            aria-label="Scroll right"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default LevelStrip;
