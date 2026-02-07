/**
 * OAuth Callback Handler
 * Processes the redirect from Supabase Google OAuth
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Spinner } from '../components/Loader';
import './Auth.css';

export function AuthCallback() {
    const navigate = useNavigate();
    const { handleOAuthCallback } = useAuth();
    const { toast } = useUI();
    const [error, setError] = useState(null);

    useEffect(() => {
        const processCallback = async () => {
            try {
                await handleOAuthCallback();
                toast.success('Successfully signed in with Google!');
                navigate('/dashboard', { replace: true });
            } catch (err) {
                console.error('OAuth callback error:', err);
                setError(err.message || 'Authentication failed');
                toast.error(err.message || 'Authentication failed');

                // Redirect to login after showing error
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 3000);
            }
        };

        processCallback();
    }, [handleOAuthCallback, navigate, toast]);

    return (
        <div className="auth-callback">
            <div className="auth-callback-content">
                {error ? (
                    <>
                        <div className="auth-callback-error">
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <h2>Authentication Failed</h2>
                        <p>{error}</p>
                        <p className="auth-callback-redirect">Redirecting to login...</p>
                    </>
                ) : (
                    <>
                        <Spinner size="lg" />
                        <h2>Completing sign in...</h2>
                        <p>Please wait while we verify your account.</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default AuthCallback;
