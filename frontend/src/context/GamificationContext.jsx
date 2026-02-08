/**
 * Gamification Context
 * Manages XP, streaks, gems, hearts, quests, achievements, and leaderboards
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { useAuth } from './AuthContext';

const GamificationContext = createContext(null);

export function GamificationProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [gamificationData, setGamificationData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchGamificationData = useCallback(async () => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const { data } = await api.get(ENDPOINTS.GAMIFICATION.DASHBOARD);
            setGamificationData(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch gamification data:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchGamificationData();
    }, [fetchGamificationData]);

    const setDailyXPGoal = useCallback(async (goal) => {
        try {
            const { data } = await api.post(ENDPOINTS.GAMIFICATION.SET_XP_GOAL, {
                daily_xp_goal: goal
            });
            setGamificationData(prev => ({
                ...prev,
                xp: data
            }));
            return data;
        } catch (err) {
            console.error('Failed to set XP goal:', err);
            throw err;
        }
    }, []);

    const refillHearts = useCallback(async () => {
        try {
            const { data } = await api.post(ENDPOINTS.GAMIFICATION.HEARTS_REFILL);
            setGamificationData(prev => ({
                ...prev,
                hearts: data.hearts,
                gems: data.gems
            }));
            return data;
        } catch (err) {
            console.error('Failed to refill hearts:', err);
            throw err;
        }
    }, []);

    const useStreakFreeze = useCallback(async () => {
        try {
            const { data } = await api.post(ENDPOINTS.GAMIFICATION.STREAK_FREEZE);
            setGamificationData(prev => ({
                ...prev,
                streak: data
            }));
            return data;
        } catch (err) {
            console.error('Failed to use streak freeze:', err);
            throw err;
        }
    }, []);

    const sendFriendRequest = useCallback(async (email) => {
        try {
            const { data } = await api.post(ENDPOINTS.GAMIFICATION.FRIEND_REQUEST, {
                to_user_email: email
            });
            return data;
        } catch (err) {
            console.error('Failed to send friend request:', err);
            throw err;
        }
    }, []);

    const acceptFriendRequest = useCallback(async (friendshipId) => {
        try {
            const { data } = await api.post(ENDPOINTS.GAMIFICATION.FRIEND_ACCEPT(friendshipId));
            return data;
        } catch (err) {
            console.error('Failed to accept friend request:', err);
            throw err;
        }
    }, []);

    const rejectFriendRequest = useCallback(async (friendshipId) => {
        try {
            const { data } = await api.post(ENDPOINTS.GAMIFICATION.FRIEND_REJECT(friendshipId));
            return data;
        } catch (err) {
            console.error('Failed to reject friend request:', err);
            throw err;
        }
    }, []);

    const removeFriend = useCallback(async (friendshipId) => {
        try {
            await api.delete(ENDPOINTS.GAMIFICATION.FRIEND_DELETE(friendshipId));
        } catch (err) {
            console.error('Failed to remove friend:', err);
            throw err;
        }
    }, []);

    const value = {
        gamificationData,
        isLoading,
        error,
        refresh: fetchGamificationData,
        setDailyXPGoal,
        refillHearts,
        useStreakFreeze,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
    };

    return (
        <GamificationContext.Provider value={value}>
            {children}
        </GamificationContext.Provider>
    );
}

export function useGamification() {
    const context = useContext(GamificationContext);

    if (!context) {
        throw new Error('useGamification must be used within a GamificationProvider');
    }

    return context;
}

export default GamificationContext;
