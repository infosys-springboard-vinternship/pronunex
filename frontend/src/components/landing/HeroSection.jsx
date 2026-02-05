/**
 * Hero Section - Enterprise Grade
 * Glassmorphic blobs, 3D glass mockup, progressive animations
 */

import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Mic,
    ArrowRight,
    Play,
    CheckCircle2,
    TrendingUp,
    AudioWaveform,
    Zap,
} from 'lucide-react';
import { FlipText } from '../ui/FlipText';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { FloatingParticles } from '../ui/FloatingParticles';
import { useMousePosition } from '../../hooks/useMousePosition';
import './HeroSection.css';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' },
    },
};

const blobVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 1, ease: 'easeOut' },
    },
};

const mockupVariants = {
    hidden: { opacity: 0, y: 40, rotateX: 10 },
    visible: {
        opacity: 1,
        y: 0,
        rotateX: 0,
        transition: { duration: 0.8, ease: 'easeOut', delay: 0.4 },
    },
};

const floatingCardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i) => ({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, delay: 0.8 + i * 0.2 },
    }),
};

export default function HeroSection() {
    const [isLoaded, setIsLoaded] = useState(false);
    const { isAuthenticated } = useAuth();
    const mockupRef = useRef(null);

    // Parallax effect for blobs
    const { scrollY } = useScroll();
    const blob1Y = useTransform(scrollY, [0, 500], [0, -150]);
    const blob2Y = useTransform(scrollY, [0, 500], [0, -75]);
    const blob3Y = useTransform(scrollY, [0, 500], [0, -100]);

    // 3D tilt effect for mockup
    const { mousePosition, isHovering } = useMousePosition(mockupRef);
    const rotateX = useSpring((mousePosition.y - 0.5) * -15, { stiffness: 150, damping: 20 });
    const rotateY = useSpring((mousePosition.x - 0.5) * 15, { stiffness: 150, damping: 20 });

    useEffect(() => {
        // Trigger animations after mount
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section className="hero-section-enterprise">
            {/* Glassmorphic Blob Background */}
            <div className="hero-blobs" aria-hidden="true">
                <FloatingParticles count={25} color="#10b981" />
                <motion.div
                    className="hero-blob blob-1"
                    variants={blobVariants}
                    initial="hidden"
                    animate={isLoaded ? 'visible' : 'hidden'}
                    style={{ y: blob1Y }}
                />
                <motion.div
                    className="hero-blob blob-2"
                    variants={blobVariants}
                    initial="hidden"
                    animate={isLoaded ? 'visible' : 'hidden'}
                    transition={{ delay: 0.2 }}
                    style={{ y: blob2Y }}
                />
                <motion.div
                    className="hero-blob blob-3"
                    variants={blobVariants}
                    initial="hidden"
                    animate={isLoaded ? 'visible' : 'hidden'}
                    transition={{ delay: 0.4 }}
                    style={{ y: blob3Y }}
                />
                <div className="hero-grid-overlay" />
            </div>

            <div className="hero-container-enterprise">
                {/* Content */}
                <motion.div
                    className="hero-content-enterprise"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isLoaded ? 'visible' : 'hidden'}
                >
                    <motion.div className="hero-badge-enterprise" variants={itemVariants}>
                        <Zap className="hero-badge-icon-enterprise" aria-hidden="true" />
                        <span>AI-Powered Speech Therapy</span>
                    </motion.div>

                    <motion.h1 className="hero-headline-enterprise" variants={itemVariants}>
                        Master Your Spoken English with{' '}
                        <span className="hero-headline-accent-enterprise">
                            <FlipText duration={2.4} delay={0.2}>
                                AI-Driven Precision
                            </FlipText>
                        </span>
                    </motion.h1>

                    <motion.p className="hero-subheadline-enterprise" variants={itemVariants}>
                        From phoneme-level analysis to adaptive exercises, get a personalized
                        speech therapy experience that evolves with you. Our AI identifies
                        exactly where you struggle and creates a custom learning path.
                    </motion.p>

                    <motion.div className="hero-cta-group-enterprise" variants={itemVariants}>
                        <AnimatedButton to="/signup" variant="primary">
                            <span>Start Your First Assessment</span>
                            <ArrowRight className="animated-btn-icon" aria-hidden="true" />
                        </AnimatedButton>
                        {isAuthenticated ? (
                            <Link to="/dashboard" className="hero-cta-secondary-enterprise">
                                <Play className="hero-cta-icon-enterprise" aria-hidden="true" />
                                <span>Go to Dashboard</span>
                            </Link>
                        ) : (
                            <Link to="/login" className="hero-cta-secondary-enterprise">
                                <Play className="hero-cta-icon-enterprise" aria-hidden="true" />
                                <span>Sign In</span>
                            </Link>
                        )}
                    </motion.div>

                    <motion.div className="hero-stats-enterprise" variants={itemVariants}>
                        <div className="hero-stat-enterprise">
                            <span className="hero-stat-value-enterprise">
                                <AnimatedCounter end={44} suffix="+" />
                            </span>
                            <span className="hero-stat-label-enterprise">Phonemes Tracked</span>
                        </div>
                        <div className="hero-stat-divider-enterprise" />
                        <div className="hero-stat-enterprise">
                            <span className="hero-stat-value-enterprise">Real-time</span>
                            <span className="hero-stat-label-enterprise">Analysis</span>
                        </div>
                        <div className="hero-stat-divider-enterprise" />
                        <div className="hero-stat-enterprise">
                            <span className="hero-stat-value-enterprise">Adaptive</span>
                            <span className="hero-stat-label-enterprise">Learning Paths</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* 3D Glass Mockup */}
                <div className="hero-visual-enterprise">
                    <motion.div
                        ref={mockupRef}
                        className="hero-mockup-3d"
                        variants={mockupVariants}
                        initial="hidden"
                        animate={isLoaded ? 'visible' : 'hidden'}
                        style={{
                            perspective: '1000px',
                            rotateX: isHovering ? rotateX : 0,
                            rotateY: isHovering ? rotateY : 0,
                            transformStyle: 'preserve-3d',
                        }}
                    >
                        <div className="mockup-glass-card">
                            <div className="mockup-header-enterprise">
                                <div className="mockup-dots-enterprise">
                                    <span className="dot red" />
                                    <span className="dot yellow" />
                                    <span className="dot green" />
                                </div>
                                <span className="mockup-title-enterprise">Practice Session</span>
                            </div>
                            <div className="mockup-content-enterprise">
                                <div className="mockup-sentence-enterprise">
                                    <AudioWaveform
                                        className="mockup-wave-icon-enterprise"
                                        aria-hidden="true"
                                    />
                                    <p>"The musician played beautiful melodies"</p>
                                </div>
                                <div className="mockup-phonemes-enterprise">
                                    <span className="phoneme-tag-enterprise success">th</span>
                                    <span className="phoneme-tag-enterprise success">m</span>
                                    <span className="phoneme-tag-enterprise warning">z</span>
                                    <span className="phoneme-tag-enterprise success">sh</span>
                                    <span className="phoneme-tag-enterprise error">r</span>
                                    <span className="phoneme-tag-enterprise success">l</span>
                                </div>
                                <div className="mockup-score-enterprise">
                                    <div className="score-ring-enterprise">
                                        <svg viewBox="0 0 36 36" className="score-svg-enterprise">
                                            <path
                                                className="score-bg-enterprise"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                            <path
                                                className="score-fill-enterprise"
                                                strokeDasharray="85, 100"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                        </svg>
                                        <span className="score-value-enterprise">85%</span>
                                    </div>
                                    <span className="score-label-enterprise">
                                        Pronunciation Score
                                    </span>
                                </div>
                                <button
                                    className="mockup-record-btn-enterprise"
                                    aria-label="Record button demo"
                                >
                                    <Mic aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {/* Depth layers */}
                        <div className="mockup-shadow-layer layer-1" aria-hidden="true" />
                        <div className="mockup-shadow-layer layer-2" aria-hidden="true" />
                    </motion.div>

                    {/* Floating Cards */}
                    <motion.div
                        className="hero-floating-card-enterprise card-1"
                        custom={0}
                        variants={floatingCardVariants}
                        initial="hidden"
                        animate={isLoaded ? 'visible' : 'hidden'}
                    >
                        <CheckCircle2 className="floating-icon-enterprise" aria-hidden="true" />
                        <span>Phoneme Detected</span>
                    </motion.div>
                    <motion.div
                        className="hero-floating-card-enterprise card-2"
                        custom={1}
                        variants={floatingCardVariants}
                        initial="hidden"
                        animate={isLoaded ? 'visible' : 'hidden'}
                    >
                        <TrendingUp className="floating-icon-enterprise" aria-hidden="true" />
                        <span>+12% This Week</span>
                    </motion.div>
                </div>
            </div>
        </section >
    );
}
