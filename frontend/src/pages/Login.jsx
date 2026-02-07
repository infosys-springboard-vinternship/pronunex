/**
 * Login Page
 * JWT authentication form with animated characters
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Spinner } from '../components/Loader';
import { AnimatedCharacters } from '../components/auth';
import './Auth.css';

export function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { toast } = useUI();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            await login(formData.email, formData.password);
            toast.success('Welcome back!');
            navigate('/');
        } catch (error) {
            if (error.status === 401) {
                setErrors({ form: 'Invalid email or password' });
            } else {
                toast.error(error.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
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
                    />
                </div>

                {/* Decorative elements */}
                <div className="auth-decoration auth-decoration--grid" />
                <div className="auth-decoration auth-decoration--blur-1" />
                <div className="auth-decoration auth-decoration--blur-2" />
            </div>

            {/* Right Panel - Login Form */}
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
                        <h1 className="auth-title">Welcome back!</h1>
                        <p className="auth-subtitle">Please enter your details</p>
                    </div>

                    {/* Login Form */}
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
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setIsTyping(true)}
                                    onBlur={() => setIsTyping(false)}
                                    autoComplete="current-password"
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
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>

                        <div className="form-options">
                            <Link to="/forgot-password" className="auth-link auth-link--sm">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className="auth-submit btn btn--primary btn--lg w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner size="sm" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    <span>Log in</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Sign Up Link */}
                    <div className="auth-footer">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/signup" className="auth-link">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
