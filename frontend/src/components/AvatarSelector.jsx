import { AVATARS } from '../config/avatarConfig';
import './AvatarSelector.css';

/**
 * AvatarSelector Component
 * Displays a grid of predefined avatars for user selection
 * 
 * @param {string} selectedId - Currently selected avatar ID
 * @param {function} onSelect - Callback when an avatar is selected
 */
export function AvatarSelector({ selectedId, onSelect }) {
    return (
        <div className="avatar-selector">
            <h4 className="avatar-selector__title">CHOOSE YOUR AVATAR</h4>
            <div className="avatar-selector__grid">
                {AVATARS.map((avatar) => (
                    <button
                        key={avatar.id}
                        type="button"
                        className={`avatar-selector__item ${selectedId === avatar.id ? 'avatar-selector__item--selected' : ''
                            }`}
                        onClick={() => onSelect(avatar.id)}
                        aria-label={`Select ${avatar.alt}`}
                        aria-pressed={selectedId === avatar.id}
                    >
                        <img
                            src={avatar.src}
                            alt={avatar.alt}
                            className="avatar-selector__image"
                        />
                        {selectedId === avatar.id && (
                            <span className="avatar-selector__check">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
