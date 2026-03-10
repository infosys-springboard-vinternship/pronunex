/**
 * PipelineLoader — Single-line processing indicator
 * 
 * Shows only the current active stage, cycling through pipeline steps.
 * Compact single-line design with spinner + label + microcopy.
 */

import { useState, useEffect, useRef } from 'react';
import './PipelineLoader.css';

const STAGES = [
    { 
        id: 'upload', 
        label: 'Submitting Audio',
        subtexts: ['Uploading recording', 'Sending to server']
    },
    { 
        id: 'clean', 
        label: 'Cleaning & Normalizing',
        subtexts: ['Removing background noise', 'Normalizing audio levels']
    },
    { 
        id: 'validate', 
        label: 'Speech Recognition',
        subtexts: ['Transcribing speech', 'Validating content match']
    },
    { 
        id: 'align', 
        label: 'Phoneme Alignment',
        subtexts: ['Mapping phonemes', 'Aligning timestamps']
    },
    { 
        id: 'score', 
        label: 'Scoring Pronunciation',
        subtexts: ['Computing embeddings', 'Comparing to native models', 'Finalizing score']
    },
];

// Estimated ms before advancing to next stage
const STAGE_DELAYS = [400, 800, 1800, 1200, 0];
const SUBTEXT_INTERVAL = 1800;

// SVG spinner
const SpinnerIcon = () => (
    <svg className="pipeline__spinner-svg" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9 1.5a7.5 7.5 0 0 1 7.5 7.5" />
    </svg>
);

export function PipelineLoader({ isActive }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [subtextIndex, setSubtextIndex] = useState(0);
    const [dots, setDots] = useState('');
    const [fadeKey, setFadeKey] = useState(0);

    // Advance stages on timers
    useEffect(() => {
        if (!isActive) return;

        setActiveIndex(0);
        setSubtextIndex(0);
        setDots('');
        setFadeKey(0);

        let cumulativeDelay = 0;
        const timers = [];

        for (let i = 0; i < STAGES.length - 1; i++) {
            cumulativeDelay += STAGE_DELAYS[i];
            const nextIndex = i + 1;

            const timer = setTimeout(() => {
                setActiveIndex(nextIndex);
                setSubtextIndex(0);
                setFadeKey(prev => prev + 1);
            }, cumulativeDelay);

            timers.push(timer);
        }

        return () => timers.forEach(clearTimeout);
    }, [isActive]);

    // Rotate subtexts
    useEffect(() => {
        if (!isActive || activeIndex >= STAGES.length) return;

        const interval = setInterval(() => {
            const max = STAGES[activeIndex].subtexts.length;
            setSubtextIndex(prev => (prev + 1) % max);
        }, SUBTEXT_INTERVAL);

        return () => clearInterval(interval);
    }, [isActive, activeIndex]);

    // Animated dots
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 400);

        return () => clearInterval(interval);
    }, [isActive]);

    if (!isActive || activeIndex >= STAGES.length) return null;

    const stage = STAGES[activeIndex];
    const subtext = stage.subtexts[subtextIndex];
    const stepNumber = activeIndex + 1;

    return (
        <div className="pipeline" key={fadeKey}>
            <div className="pipeline__indicator">
                <SpinnerIcon />
            </div>
            <div className="pipeline__content">
                <div className="pipeline__label">
                    <span className="pipeline__step-num">{stepNumber}/{STAGES.length}</span>
                    <span className="pipeline__stage-name">{stage.label}{dots}</span>
                </div>
                <div className="pipeline__subtext" key={`${activeIndex}-${subtextIndex}`}>
                    {subtext}
                </div>
            </div>
        </div>
    );
}
