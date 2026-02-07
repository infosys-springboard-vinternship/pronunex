/**
 * Forgot Password Page
 * Password reset request form with animated characters
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { Spinner } from '../components/Loader';
import { AnimatedCharacters } from '../components/auth';
import './Auth.css';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errors, setErrors] = useState({});
    const [isTyping, setIsTyping] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Invalid email format';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        setErrors({});

        try {
            await api.post(ENDPOINTS.AUTH.PASSWORD_RESET, { email });
            setIsSuccess(true);
        } catch (error) {
            const errorData = error.data || {};

            if (errorData.email) {
                setErrors({
                    email: Array.isArray(errorData.email) ? errorData.email[0] : errorData.email
                });
            } else if (errorData.error) {
                setErrors({ form: errorData.error });
            } else if (errorData.detail) {
                setErrors({ form: errorData.detail });
            } else {
                setErrors({ form: error.message || 'Failed to send reset email. Please try again.' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Success state
    if (isSuccess) {
        return (
            <div className="auth-page">
                {/* Left Panel - Animated Characters */}
                <div className="auth-left-panel">
                    <Link to="/" className="auth-left-logo auth-logo-link">
                        <img src="/icon.png" alt="Pronunex" />
                        <span>Pronunex</span>
                    </Link>

                    <div className="auth-characters-wrapper">
                        <AnimatedCharacters isTyping={false} />
                    </div>

                    {/* Decorative elements */}
                    <div className="auth-decoration auth-decoration--grid" />
                    <div className="auth-decoration auth-decoration--blur-1" />
                    <div className="auth-decoration auth-decoration--blur-2" />
                </div>

                {/* Right Panel - Success Message */}
                <div className="auth-right-panel">
                    <div className="auth-form-wrapper">
                        {/* Mobile Logo */}
                        <Link to="/" className="auth-mobile-logo auth-logo-link">
                            <img src="/icon.png" alt="Pronunex" />
                            <span>Pronunex</span>
                        </Link>

                        {/* Back button for mobile */}
                        <Link to="/" className="auth-back-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            <span>Back</span>
                        </Link>

                        {/* Header */}
                        <div className="auth-header">
                            <div className="auth-success-icon">
                                <CheckCircle size={48} />
                            </div>
                            <h1 className="auth-title">Check Your Email</h1>
                            <p className="auth-subtitle">
                                If an account exists with {email}, you will receive a password reset link shortly.
                            </p>
                        </div>

                        {/* Login Link */}
                        <div className="auth-footer">
                            <p>
                                Remember your password?{' '}
                                <Link to="/login" className="auth-link">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            {/* Left Panel - Animated Characters */}
            <div className="auth-left-panel">
                <Link to="/" className="auth-left-logo auth-logo-link">
                    <img src="/icon.png" alt="Pronunex" />
                    <span>Pronunex</span>
                </Link>

                <div className="auth-characters-wrapper">
                    <AnimatedCharacters isTyping={isTyping} />
                </div>

                {/* Decorative elements */}
                <div className="auth-decoration auth-decoration--grid" />
                <div className="auth-decoration auth-decoration--blur-1" />
                <div className="auth-decoration auth-decoration--blur-2" />
            </div>

            {/* Right Panel - Forgot Password Form */}
            <div className="auth-right-panel">
                <div className="auth-form-wrapper">
                    {/* Mobile Logo */}
                    <Link to="/" className="auth-mobile-logo auth-logo-link">
                        <img src="/icon.png" alt="Pronunex" />
                        <span>Pronunex</span>
                    </Link>

                    {/* Back button for mobile */}
                    <Link to="/" className="auth-back-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </Link>

                    {/* Header */}
                    <div className="auth-header">
                        <h1 className="auth-title">Forgot Password</h1>
                        <p className="auth-subtitle">
                            Enter your email and we'll send you a reset link
                        </p>
                    </div>

                    {/* Forgot Password Form */}
                    <form className="auth-form" onSubmit={handleSubmit}>
                        {errors.form && (
                            <div className="auth-error" role="alert">
                                {errors.form}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email
                            </label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errors.email) {
                                            setErrors((prev) => ({ ...prev, email: null }));
                                        }
                                    }}
                                    onFocus={() => setIsTyping(true)}
                                    onBlur={() => setIsTyping(false)}
                                    autoComplete="email"
                                    disabled={isLoading}
                                />
                            </div>
                            {errors.email && <span className="form-error">{errors.email}</span>}
                        </div>

                        <button
                            type="submit"
                            className="auth-submit btn btn--primary btn--lg w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner size="sm" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    <span>Send Reset Link</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="auth-footer">
                        <p>
                            Remember your password?{' '}
                            <Link to="/login" className="auth-link">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;
