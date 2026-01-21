/**
 * How It Works Section - Enterprise Grade
 * Staggered card reveals with Framer Motion
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Mic, Brain, Target } from 'lucide-react';
import './HowItWorksSection.css';

const steps = [
    {
        number: '01',
        icon: Mic,
        title: 'Record',
        description:
            'Read aloud curated sentences. Our system captures your audio with high-fidelity accuracy for precise analysis.',
    },
    {
        number: '02',
        icon: Brain,
        title: 'Analyze',
        description:
            'Our AI uses forced alignment and pronunciation scoring to find exactly where you struggle at the phoneme level.',
    },
    {
        number: '03',
        icon: Target,
        title: 'Adapt',
        description:
            'Receive a personalized roadmap of exercises focusing on your specific problematic phonemes and sounds.',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: 'easeOut' },
    },
};

const headerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 },
    },
};

export default function HowItWorksSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section className="how-it-works-enterprise" id="how-it-works" ref={ref}>
            <div className="section-container-enterprise">
                <motion.div
                    className="section-header-enterprise"
                    variants={headerVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                >
                    <span className="section-label-enterprise">Simple Process</span>
                    <h2 className="section-title-enterprise">How It Works</h2>
                    <p className="section-description-enterprise">
                        Our three-step methodology ensures continuous improvement in your
                        pronunciation skills
                    </p>
                </motion.div>

                <motion.div
                    className="steps-grid-enterprise"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                >
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.number}
                            className="step-card-enterprise"
                            variants={itemVariants}
                        >
                            <div className="step-number-enterprise">{step.number}</div>
                            <div className="step-icon-wrapper-enterprise">
                                <step.icon className="step-icon-enterprise" aria-hidden="true" />
                            </div>
                            <h3 className="step-title-enterprise">{step.title}</h3>
                            <p className="step-description-enterprise">{step.description}</p>
                            {index < steps.length - 1 && (
                                <div className="step-connector-enterprise" aria-hidden="true" />
                            )}
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
