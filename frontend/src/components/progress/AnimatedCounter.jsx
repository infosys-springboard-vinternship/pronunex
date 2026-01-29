/**
 * Animated Counter Component
 * Counts up to a target value with smooth animation
 */

import { useEffect, useState, useRef } from 'react';

export function AnimatedCounter({ 
    value, 
    duration = 1000, 
    suffix = '', 
    prefix = '',
    decimals = 0 
}) {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const targetValue = typeof value === 'number' ? value : parseFloat(value) || 0;
        
        const animate = (timestamp) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentCount = easeOut * targetValue;
            countRef.current = currentCount;
            setCount(currentCount);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [value, duration]);

    const displayValue = decimals > 0 
        ? count.toFixed(decimals) 
        : Math.floor(count);

    return (
        <span>
            {prefix}{displayValue}{suffix}
        </span>
    );
}

export default AnimatedCounter;
