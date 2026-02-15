/**
 * Auth Context
 * User authentication state, login/logout methods, protected route handling
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();

    // Check for existing session on mount
    useEffect(() => {
        const checkAuth = async () => {
            const storedAccess = sessionStorage.getItem('access_token');
            const storedRefresh = sessionStorage.getItem('refresh_token');

            if (storedAccess && storedRefresh) {
                api.setTokens(storedAccess, storedRefresh);

                try {
                    const { data } = await api.get(ENDPOINTS.AUTH.PROFILE);
                    setUser(data);
                    setIsAuthenticated(true);
                } catch {
                    // Token invalid, clear storage
                    sessionStorage.removeItem('access_token');
                    sessionStorage.removeItem('refresh_token');
                    api.clearTokens();
                }
            }

            setIsLoading(false);
        };

        checkAuth();
    }, []);

    // Set up unauthorized callback
    useEffect(() => {
        api.setOnUnauthorized(() => {
            logout();
            navigate('/login');
        });
    }, [navigate]);

    /**
     * Login with email and password
     */
    const login = useCallback(async (email, password) => {
        const { data } = await api.post(ENDPOINTS.AUTH.LOGIN, { email, password });

        // Backend returns { tokens: { access, refresh }, user: {...} }
        const tokens = data.tokens || data;

        // Store tokens in session storage (cleared on browser close)
        sessionStorage.setItem('access_token', tokens.access);
        sessionStorage.setItem('refresh_token', tokens.refresh);

        api.setTokens(tokens.access, tokens.refresh);
        setUser(data.user);
        setIsAuthenticated(true);

        return data;
    }, []);

    /**
     * Register new user
     */
    const signup = useCallback(async (userData) => {
        const { data } = await api.post(ENDPOINTS.AUTH.REGISTER, userData);

        // Backend returns { tokens: { access, refresh }, user: {...} }
        const tokens = data.tokens;

        // Auto-login after signup if tokens returned
        if (tokens && tokens.access && tokens.refresh) {
            sessionStorage.setItem('access_token', tokens.access);
            sessionStorage.setItem('refresh_token', tokens.refresh);
            api.setTokens(tokens.access, tokens.refresh);
            setUser(data.user);
            setIsAuthenticated(true);
        }

        return data;
    }, []);

    /**
     * Logout user
     */
    const logout = useCallback(async () => {
        // Save refresh token before clearing (needed for backend invalidation)
        const refreshToken = sessionStorage.getItem('refresh_token');

        // Clear everything FIRST to prevent cascade
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        api.clearTokens();
        api._isLoggingOut = false; // Reset guard for next login
        setUser(null);
        setIsAuthenticated(false);

        // Fire-and-forget backend token invalidation using raw fetch
        // (not api.post, which would trigger the 401 interceptor)
        if (refreshToken) {
            try {
                await fetch(ENDPOINTS.AUTH.LOGOUT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken }),
                });
            } catch {
                // Ignore - token will expire naturally
            }
        }
    }, []);

    /**
     * Login with Google via Supabase OAuth
     */
    const loginWithGoogle = useCallback(async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            throw new Error(error.message);
        }
    }, []);

    /**
     * Handle OAuth callback - exchange Supabase token for Django JWT
     */
    const handleOAuthCallback = useCallback(async () => {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            throw new Error(error?.message || 'No session found');
        }

        // Exchange Supabase token for Django JWT
        const { data } = await api.post(ENDPOINTS.AUTH.GOOGLE, {
            access_token: session.access_token,
            provider_token: session.provider_token,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        });

        // Store Django tokens
        const tokens = data.tokens || data;
        sessionStorage.setItem('access_token', tokens.access);
        sessionStorage.setItem('refresh_token', tokens.refresh);

        api.setTokens(tokens.access, tokens.refresh);
        setUser(data.user);
        setIsAuthenticated(true);

        // Sign out of Supabase (we use Django session now)
        await supabase.auth.signOut();

        return data;
    }, []);

    /**
     * Update user profile
     */
    const updateProfile = useCallback(async (profileData) => {
        const { data } = await api.put(ENDPOINTS.AUTH.PROFILE, profileData);
        setUser(data);
        return data;
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        signup,
        logout,
        loginWithGoogle,
        handleOAuthCallback,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

export default AuthContext;
