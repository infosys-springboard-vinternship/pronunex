/**
 * ScrollProgress Component
 * Shows scroll progress as a thin line at the top of the viewport
 */

import { motion, useScroll, useSpring } from 'framer-motion';
import './ScrollProgress.css';

/**
 * @param {Object} props
 * @param {string} props.color - Progress bar color (default: emerald)
 */
export function ScrollProgress({ color = '#10b981' }) {
    const { scrollYProgress } = useScroll();

    // Add spring physics for smooth animation
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <motion.div
            className="scroll-progress-bar"
            style={{
                scaleX,
                backgroundColor: color,
            }}
        />
    );
}

export default ScrollProgress;
