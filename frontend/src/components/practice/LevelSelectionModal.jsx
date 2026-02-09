/**
 * Level Selection Modal
 * Popup that appears on Practice page load to let users choose pronunciation difficulty level.
 * Works independently from the Settings page level selection.
 */

import { Modal } from '../Modal';
import { Target, Zap, Trophy } from 'lucide-react';
import './LevelSelectionModal.css';

// Level configuration with icons and descriptions
const LEVELS = [
    {
        id: 'beginner',
        label: 'Beginner',
        description: 'Easy & fun pronunciation practice',
        icon: Target,
        color: 'beginner'
    },
    {
        id: 'intermediate',
        label: 'Intermediate',
        description: 'Controlled pronunciation with clusters',
        icon: Zap,
        color: 'intermediate'
    },
    {
        id: 'advanced',
        label: 'Advanced',
        description: 'Challenging tongue twisters',
        icon: Trophy,
        color: 'advanced'
    }
];

/**
 * LevelSelectionModal component
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onSelectLevel - Callback when a level is selected, receives level id
 */
export function LevelSelectionModal({ isOpen, onSelectLevel }) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { }} // No close action - user must select a level
            title="Choose Your Pronunciation Level"
            size="md"
            showCloseButton={false}
            closeOnOverlayClick={false}
            closeOnEsc={false}
        >
            <div className="level-modal">
                <p className="level-modal__subtitle">
                    Select a difficulty level to start your practice session
                </p>

                <div className="level-modal__options">
                    {LEVELS.map((level) => {
                        const IconComponent = level.icon;
                        return (
                            <button
                                key={level.id}
                                type="button"
                                className={`level-modal__option level-modal__option--${level.color}`}
                                onClick={() => onSelectLevel(level.id)}
                            >
                                <div className="level-modal__option-icon">
                                    <IconComponent size={28} />
                                </div>
                                <div className="level-modal__option-content">
                                    <span className="level-modal__option-label">
                                        {level.label}
                                    </span>
                                    <span className="level-modal__option-description">
                                        {level.description}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
}

export default LevelSelectionModal;
