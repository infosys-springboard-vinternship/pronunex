/**
 * Technical Trust Section - Enterprise Grade
 * Consistent icon stroke weights with subtle hover animations
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Brain, Shield, Lock } from 'lucide-react';
import './TechnicalTrustSection.css';

const trustItems = [
    {
        icon: Brain,
        title: 'Wav2Vec2 Technology',
        description:
            'Powered by state-of-the-art speech recognition models for accurate phoneme detection and forced alignment.',
    },
    {
        icon: Shield,
        title: 'Privacy First',
        description:
            'Your voice data is processed securely and used only for your improvement. We never share your recordings.',
    },
    {
        icon: Lock,
        title: 'Secure Platform',
        description:
            'Enterprise-grade security with encrypted data transmission and secure authentication protocols.',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 },
    },
};

export default function TechnicalTrustSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section className="trust-section-enterprise" id="technology" ref={ref}>
            <div className="section-container-enterprise">
                <motion.div
                    className="section-header-enterprise"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="section-label-enterprise">Technology</span>
                    <h2 className="section-title-enterprise">Built on Solid Foundations</h2>
                    <p className="section-description-enterprise">
                        Cutting-edge AI technology combined with robust security measures
                    </p>
                </motion.div>

                <motion.div
                    className="trust-grid-enterprise"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                >
                    {trustItems.map((item) => (
                        <motion.div
                            key={item.title}
                            className="trust-card-enterprise"
                            variants={itemVariants}
                            whileHover={{ y: -4 }}
                        >
                            <div className="trust-icon-wrapper-enterprise">
                                <item.icon
                                    className="trust-icon-enterprise"
                                    aria-hidden="true"
                                />
                            </div>
                            <h3 className="trust-title-enterprise">{item.title}</h3>
                            <p className="trust-description-enterprise">{item.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
