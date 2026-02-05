/**
 * AnimatedButton Component
 * A button with shiny border and text reveal effect for CTAs
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './AnimatedButton.css';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.to - Link destination (for react-router Link)
 * @param {string} props.href - External link destination
 * @param {string} props.className - Additional CSS classes
 * @param {function} props.onClick - Click handler
 * @param {string} props.variant - 'primary' | 'secondary' (default: 'primary')
 */
export function AnimatedButton({
    children,
    to,
    href,
    className = '',
    onClick,
    variant = 'primary',
    ...rest
}) {
    const buttonContent = (
        <>
            {/* Text with reveal mask effect */}
            <motion.span
                className="animated-btn-text"
                style={{
                    WebkitMaskImage:
                        'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))',
                    maskImage:
                        'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))',
                }}
                initial={{ '--mask-x': '100%' }}
                animate={{ '--mask-x': '-100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', repeatDelay: 1.5 }}
            >
                {children}
            </motion.span>

            {/* Shiny border effect */}
            <motion.span
                className="animated-btn-shine"
                initial={{ backgroundPosition: '100% 0', opacity: 0 }}
                animate={{ backgroundPosition: ['100% 0', '0% 0'], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
            />
        </>
    );

    const baseClassName = `animated-btn animated-btn-${variant} ${className}`;

    // Render as Link if 'to' prop is provided
    if (to) {
        return (
            <motion.div
                whileTap={{ scale: 0.97 }}
                transition={{
                    stiffness: 20,
                    damping: 15,
                    mass: 2,
                    scale: { type: 'spring', stiffness: 200, damping: 10, mass: 0.1 },
                }}
                className="animated-btn-wrapper"
            >
                <Link to={to} className={baseClassName} {...rest}>
                    {buttonContent}
                </Link>
            </motion.div>
        );
    }

    // Render as anchor if 'href' prop is provided
    if (href) {
        return (
            <motion.a
                href={href}
                className={baseClassName}
                whileTap={{ scale: 0.97 }}
                transition={{
                    stiffness: 20,
                    damping: 15,
                    mass: 2,
                    scale: { type: 'spring', stiffness: 200, damping: 10, mass: 0.1 },
                }}
                {...rest}
            >
                {buttonContent}
            </motion.a>
        );
    }

    // Render as button
    return (
        <motion.button
            className={baseClassName}
            onClick={onClick}
            whileTap={{ scale: 0.97 }}
            transition={{
                stiffness: 20,
                damping: 15,
                mass: 2,
                scale: { type: 'spring', stiffness: 200, damping: 10, mass: 0.1 },
            }}
            {...rest}
        >
            {buttonContent}
        </motion.button>
    );
}

export default AnimatedButton;
