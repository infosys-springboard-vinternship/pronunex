/**
 * Feature Grid Section - Enterprise Grade
 * Hover-glow effects with unique gradients per card
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Focus, Route, BarChart3, LayoutDashboard } from 'lucide-react';
import './FeatureGridSection.css';

const features = [
    {
        icon: Focus,
        title: 'Phoneme-Level Accuracy',
        description:
            "Don't just get a score; see exactly which sounds (like /th/ or /r/) need work. Our AI pinpoints your specific challenges.",
        gradient: 'emerald',
    },
    {
        icon: Route,
        title: 'Adaptive Learning Paths',
        description:
            'The platform generates exercises based on your unique "Focus Areas." Each session adapts to your progress.',
        gradient: 'teal',
    },
    {
        icon: BarChart3,
        title: 'Fluency & Prosody Tracking',
        description:
            'Measure your rhythm, pace, and intonation against native-level models. Track improvements over time.',
        gradient: 'amber',
    },
    {
        icon: LayoutDashboard,
        title: 'Interactive Dashboards',
        description:
            'Visualize your journey from "Beginner" to "Pro" with data-driven charts showing every milestone.',
        gradient: 'rose',
    },
];

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

const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.5, ease: 'easeOut' },
    },
};

export default function FeatureGridSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section className="features-enterprise" id="features" ref={ref}>
            <div className="section-container-enterprise">
                <motion.div
                    className="section-header-enterprise"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="section-label-enterprise">Key Features</span>
                    <h2 className="section-title-enterprise">Everything You Need to Improve</h2>
                    <p className="section-description-enterprise">
                        Comprehensive tools designed to accelerate your pronunciation mastery
                    </p>
                </motion.div>

                <motion.div
                    className="features-grid-enterprise"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                >
                    {features.map((feature) => (
                        <motion.article
                            key={feature.title}
                            className={`feature-card-enterprise gradient-${feature.gradient}`}
                            variants={cardVariants}
                        >
                            <div className="feature-icon-wrapper-enterprise">
                                <feature.icon
                                    className="feature-icon-enterprise"
                                    aria-hidden="true"
                                />
                            </div>
                            <h3 className="feature-title-enterprise">{feature.title}</h3>
                            <p className="feature-description-enterprise">{feature.description}</p>
                            <div className="feature-glow-enterprise" aria-hidden="true" />
                            <div className="feature-border-glow" aria-hidden="true" />
                        </motion.article>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
