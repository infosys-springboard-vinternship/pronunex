/**
 * FloatingParticles Component
 * Ambient background particles with subtle movement
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './FloatingParticles.css';

export function FloatingParticles({ count = 30, color = '#10b981' }) {
    const particles = Array.from({ length: count }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 2, // 2-6px
        x: Math.random() * 100, // 0-100%
        y: Math.random() * 100,
        duration: Math.random() * 20 + 15, // 15-35s
        delay: Math.random() * 5,
        opacity: Math.random() * 0.3 + 0.1, // 0.1-0.4
    }));

    return (
        <div className="floating-particles" aria-hidden="true">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="particle"
                    style={{
                        width: particle.size,
                        height: particle.size,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        backgroundColor: color,
                        opacity: particle.opacity,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        x: [0, 15, -15, 0],
                        opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        delay: particle.delay,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

export default FloatingParticles;
