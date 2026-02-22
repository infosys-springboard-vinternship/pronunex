/**
 * PremiumTooltip Component
 * Portal-rendered animated tooltip — escapes all stacking/overflow issues.
 * Uses createPortal to render at document.body level (Stripe/Linear pattern).
 * Framer Motion spring animation with hover delay.
 */

import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import './PremiumTooltip.css';

const tooltipMotion = {
    initial: { opacity: 0, y: 8, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 6, scale: 0.95 },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
};

export function PremiumTooltip({ children, errors = [], expected, actual, errorType }) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const timeoutRef = useRef(null);
    const anchorRef = useRef(null);

    const updatePosition = useCallback(() => {
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        setPosition({
            top: rect.top + window.scrollY - 12, // 12px gap above word
            left: rect.left + window.scrollX + rect.width / 2,
        });
    }, []);

    const handleMouseEnter = useCallback(() => {
        timeoutRef.current = setTimeout(() => {
            updatePosition();
            setIsVisible(true);
        }, 150);
    }, [updatePosition]);

    const handleMouseLeave = useCallback(() => {
        clearTimeout(timeoutRef.current);
        setIsVisible(false);
    }, []);

    // Recalculate position on scroll/resize while visible
    useLayoutEffect(() => {
        if (!isVisible) return;
        const handleReposition = () => updatePosition();
        window.addEventListener('scroll', handleReposition, true);
        window.addEventListener('resize', handleReposition);
        return () => {
            window.removeEventListener('scroll', handleReposition, true);
            window.removeEventListener('resize', handleReposition);
        };
    }, [isVisible, updatePosition]);

    // Don't render tooltip wrapper if there's nothing to show
    const hasContent = (errors && errors.length > 0) || errorType;
    if (!hasContent) return children;

    // Label for error type
    const typeLabels = {
        deletion: 'Missing Sound',
        substitution: 'Wrong Sound',
        insertion: 'Extra Sound',
    };

    // Color class per error type
    const typeColors = {
        deletion: 'premium-tooltip__type--deletion',
        substitution: 'premium-tooltip__type--substitution',
        insertion: 'premium-tooltip__type--insertion',
    };

    return (
        <>
            <span
                ref={anchorRef}
                className="premium-tooltip__anchor"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </span>
            {createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            className="premium-tooltip"
                            style={{
                                top: position.top,
                                left: position.left,
                            }}
                            {...tooltipMotion}
                            role="tooltip"
                        >
                            {/* Arrow */}
                            <div className="premium-tooltip__arrow" />

                            {/* Header */}
                            <div className="premium-tooltip__header">
                                <Volume2 size={14} className="premium-tooltip__icon" />
                                <span className="premium-tooltip__heading">Pronunciation Hint</span>
                            </div>

                            {/* Error type badge */}
                            {errorType && (
                                <span className={`premium-tooltip__type ${typeColors[errorType] || ''}`}>
                                    {typeLabels[errorType] || errorType}
                                </span>
                            )}

                            {/* Expected vs actual */}
                            {expected && (
                                <div className="premium-tooltip__comparison">
                                    <div className="premium-tooltip__expected">
                                        <span className="premium-tooltip__comp-label">Expected</span>
                                        <span className="premium-tooltip__comp-value premium-tooltip__comp-value--correct">{expected}</span>
                                    </div>
                                    <span className="premium-tooltip__comp-arrow">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    </span>
                                    <div className="premium-tooltip__actual">
                                        <span className="premium-tooltip__comp-label">Got</span>
                                        <span className="premium-tooltip__comp-value premium-tooltip__comp-value--error">{actual || 'missing'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Error descriptions list */}
                            {errors.length > 0 && (
                                <div className="premium-tooltip__errors">
                                    {errors.map((err, i) => (
                                        <p key={i} className="premium-tooltip__error-text">{err}</p>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

export default PremiumTooltip;
