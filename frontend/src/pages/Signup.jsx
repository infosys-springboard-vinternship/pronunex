/**
 * Signup Page
 * User registration form with animated characters
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Spinner } from '../components/Loader';
import { AnimatedCharacters, PasswordStrength, GoogleButton } from '../components/auth';
import './Auth.css';

export function Signup() {
    const navigate = useNavigate();
    const { signup, loginWithGoogle } = useAuth();
    const { toast } = useUI();

    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        password_confirm: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isTyping, setIsTyping] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        }
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.password_confirm) {
            newErrors.password_confirm = 'Passwords do not match';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            await signup({
                username: formData.username,
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                password_confirm: formData.password_confirm,
            });
            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            const errorData = error.data || {};
            const newErrors = {};

            if (errorData.email) {
                newErrors.email = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
            }
            if (errorData.username) {
                newErrors.username = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username;
            }
            if (errorData.password) {
                newErrors.password = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
            }
            if (errorData.password_confirm) {
                newErrors.password_confirm = Array.isArray(errorData.password_confirm) ? errorData.password_confirm[0] : errorData.password_confirm;
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
            } else {
                toast.error(error.message || 'Registration failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setIsGoogleLoading(true);
        try {
            await loginWithGoogle();
            // Redirect happens automatically via Supabase
        } catch (error) {
            toast.error(error.message || 'Google signup failed');
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Left Panel - Animated Characters */}
            <div className="auth-left-panel">
                <Link to="/" className="auth-left-logo auth-logo-link">
                    <img src="/icon.png" alt="Pronunex" />
                    <span>Pronunex</span>
                </Link>

                <div className="auth-characters-wrapper">
                    <AnimatedCharacters
                        isTyping={isTyping}
                        passwordLength={formData.password.length}
                        showPassword={showPassword}
                        confirmPasswordLength={formData.password_confirm.length}
                        showConfirmPassword={showConfirmPassword}
                    />
                </div>

                {/* Decorative elements */}
                <div className="auth-decoration auth-decoration--grid" />
                <div className="auth-decoration auth-decoration--blur-1" />
                <div className="auth-decoration auth-decoration--blur-2" />
            </div>

            {/* Right Panel - Signup Form */}
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
                        <h1 className="auth-title">Create an account</h1>
                        <p className="auth-subtitle">Please enter your details to sign up</p>
                    </div>

                    {/* Signup Form */}
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="username" className="form-label">
                                    Username
                                </label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        className={`form-input ${errors.username ? 'form-input--error' : ''}`}
                                        placeholder="alex"
                                        value={formData.username}
                                        onChange={handleChange}
                                        onFocus={() => setIsTyping(true)}
                                        onBlur={() => setIsTyping(false)}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.username && <span className="form-error">{errors.username}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="full_name" className="form-label">
                                    Full Name
                                </label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        id="full_name"
                                        name="full_name"
                                        className="form-input"
                                        placeholder="Alex Jr"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        onFocus={() => setIsTyping(true)}
                                        onBlur={() => setIsTyping(false)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>

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
                                    placeholder="[EMAIL_ADDRESS]"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onFocus={() => setIsTyping(true)}
                                    onBlur={() => setIsTyping(false)}
                                    autoComplete="email"
                                    disabled={isLoading}
                                />
                            </div>
                            {errors.email && <span className="form-error">{errors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Password
                            </label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                                    placeholder="At least 8 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setIsTyping(true)}
                                    onBlur={() => setIsTyping(false)}
                                    autoComplete="new-password"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="input-action"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <PasswordStrength password={formData.password} />
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password_confirm" className="form-label">
                                Confirm Password
                            </label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="password_confirm"
                                    name="password_confirm"
                                    className={`form-input ${errors.password_confirm ? 'form-input--error' : ''}`}
                                    placeholder="Confirm your password"
                                    value={formData.password_confirm}
                                    onChange={handleChange}
                                    onFocus={() => setIsTyping(true)}
                                    onBlur={() => setIsTyping(false)}
                                    autoComplete="new-password"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="input-action"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password_confirm && (
                                <span className="form-error">{errors.password_confirm}</span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="auth-submit btn btn--primary btn--lg w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner size="sm" />
                                    <span>Creating account...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    <span>Sign Up</span>
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="auth-divider">
                            <span>or sign up with</span>
                        </div>

                        {/* Google Sign-Up */}
                        <GoogleButton
                            onClick={handleGoogleSignup}
                            isLoading={isGoogleLoading}
                            label="Sign up with Google"
                        />
                    </form>

                    {/* Login Link */}
                    <div className="auth-footer">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login" className="auth-link">
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Signup;
