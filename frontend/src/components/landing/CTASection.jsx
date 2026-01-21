/**
 * CTA Section - Enterprise Grade
 * Enhanced gradient animation on hover
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './CTASection.css';

export default function CTASection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section className="cta-section-enterprise" ref={ref}>
            <motion.div
                className="cta-container-enterprise"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6 }}
            >
                <div className="cta-content-enterprise">
                    <motion.h2
                        className="cta-title-enterprise"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ delay: 0.2 }}
                    >
                        Ready to Improve Your Pronunciation?
                    </motion.h2>
                    <motion.p
                        className="cta-description-enterprise"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ delay: 0.3 }}
                    >
                        Join thousands of learners who are mastering English pronunciation with
                        AI-powered precision.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={
                            isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
                        }
                        transition={{ delay: 0.4 }}
                    >
                        <Link to="/signup" className="cta-button-enterprise">
                            <span>Get Started Free</span>
                            <ArrowRight
                                className="cta-button-icon-enterprise"
                                aria-hidden="true"
                            />
                        </Link>
                    </motion.div>
                </div>
                <div className="cta-bg-pattern-enterprise" aria-hidden="true" />
                <div className="cta-glow-enterprise" aria-hidden="true" />
            </motion.div>
        </section>
    );
}
