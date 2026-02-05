/**
 * AnimatedCounter Component
 * Counts up from 0 to target value when component enters viewport
 */

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/**
 * @param {Object} props
 * @param {number} props.end - Target number to count up to
 * @param {number} props.duration - Animation duration in milliseconds (default: 2000)
 * @param {string} props.suffix - Optional suffix (e.g., "+", "%")
 * @param {string} props.className - Additional CSS classes
 */
export function AnimatedCounter({ end, duration = 2000, suffix = '', className = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (isInView && !hasAnimated.current) {
            hasAnimated.current = true;
            const startTime = Date.now();
            const startValue = 0;

            const animate = () => {
                const now = Date.now();
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for smooth acceleration and deceleration
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = Math.floor(startValue + (end - startValue) * easeOutQuart);

                setCount(current);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setCount(end);
                }
            };

            requestAnimationFrame(animate);
        }
    }, [isInView, end, duration]);

    return (
        <span ref={ref} className={className}>
            {count}{suffix}
        </span>
    );
}

export default AnimatedCounter;
