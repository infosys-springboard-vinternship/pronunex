import React, { useMemo } from 'react';
import './PasswordStrength.css';

/**
 * Password Strength Indicator Component
 * Shows visual feedback for password strength
 */
export function PasswordStrength({ password }) {
    const strength = useMemo(() => {
        if (!password) return { score: 0, label: '', color: 'none' };

        let score = 0;

        // Length check
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;

        // Complexity checks
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^a-zA-Z0-9]/.test(password)) score += 1;

        // Determine strength level
        if (score <= 2) return { score: 1, label: 'Weak', color: 'weak' };
        if (score <= 4) return { score: 2, label: 'Fair', color: 'fair' };
        if (score <= 5) return { score: 3, label: 'Good', color: 'good' };
        return { score: 4, label: 'Strong', color: 'strong' };
    }, [password]);

    if (!password) return null;

    return (
        <div className="password-strength">
            <div className="password-strength__bar">
                <div
                    className={`password-strength__fill password-strength__fill--${strength.color}`}
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                />
            </div>
            <span className={`password-strength__label password-strength__label--${strength.color}`}>
                {strength.label}
            </span>
        </div>
    );
}

export default PasswordStrength;
