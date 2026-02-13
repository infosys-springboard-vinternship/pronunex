/**
 * DifficultyBadge Component
 * Displays sentence difficulty level with visual cues following EdTech scaffolding principles
 */

import { Sparkles, Zap, Trophy } from 'lucide-react';
import './DifficultyBadge.css';

const DIFFICULTY_CONFIG = {
    core: {
        label: 'Pronunex Core',
        icon: Sparkles,
        description: 'Simple words, clear pronunciation'
    },
    edge: {
        label: 'Pronunex Edge',
        icon: Zap,
        description: 'Compound sentences, stress patterns'
    },
    elite: {
        label: 'Pronunex Elite',
        icon: Trophy,
        description: 'Complex prose, rhythm & elision'
    }
};

function DifficultyBadge({ level = 'core', showDescription = false }) {
    const config = DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG.core;
    const IconComponent = config.icon;

    return (
        <div className={`difficulty-badge difficulty-badge--${level}`}>
            <IconComponent size={16} className="difficulty-badge__icon" />
            <span className="difficulty-badge__label">{config.label}</span>
            {showDescription && (
                <span className="difficulty-badge__description">{config.description}</span>
            )}
        </div>
    );
}

export default DifficultyBadge;
