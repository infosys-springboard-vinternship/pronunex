/**
 * Progress Page - Comprehensive Analytics Dashboard
 * Displays user's pronunciation improvement journey with detailed visualizations
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { ENDPOINTS } from '../api/endpoints';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { NoProgress } from '../components/EmptyState';
import {
    ProgressHeader,
    StatsGrid,
    ProgressSkeleton,
    SessionHistoryCard,
    ScoreHistoryChart,
    MilestonesBadges,
    PROGRESS_CONFIG
} from '../components/progress';
import './Progress.css';

export function Progress() {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('7');

    // Fetch all required data
    const { data: progressData, isLoading: progressLoading, error: progressError, refetch: refetchProgress } =
        useApi(ENDPOINTS.ANALYTICS.PROGRESS);
    const { data: history, isLoading: historyLoading, error: historyError, refetch: refetchHistory } =
        useApi(`${ENDPOINTS.ANALYTICS.HISTORY}?days=${period}`, { deps: [period] });
    const isLoading = progressLoading || historyLoading;
    const error = progressError || historyError;

    // Process history data for chart — fill all dates including missed days
    const chartData = useMemo(() => {
        if (!history) return [];
        const historyArray = Array.isArray(history) ? history : (history.results || history.data || []);
        if (!Array.isArray(historyArray)) return [];

        // Build a lookup map from API data
        const dataByDate = {};
        historyArray.forEach(item => {
            dataByDate[item.date] = {
                score: Math.round((item.average_score || 0) * 100),
                attempts: item.attempts_count || item.attempts || 0,
            };
        });

        // Generate all dates for the period
        const days = parseInt(period) || 30;
        const allDates = [];
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const entry = dataByDate[dateStr];
            allDates.push({
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                rawDate: dateStr,
                score: entry ? entry.score : 0,
                attempts: entry ? entry.attempts : 0,
                missed: !entry,
            });
        }

        return allDates;
    }, [history, period]);



    // Calculate trend from chart data
    const trend = useMemo(() => {
        if (!chartData || chartData.length < 2) return null;
        const recent = chartData.slice(-7);
        if (recent.length < 2) return null;

        const first = recent[0].score;
        const last = recent[recent.length - 1].score;
        const diff = last - first;

        return {
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
            value: Math.abs(diff),
        };
    }, [chartData]);

    // Normalize progress data
    const stats = useMemo(() => {
        if (!progressData) return null;

        return {
            totalAttempts: progressData.total_attempts || 0,
            totalSessions: progressData.total_sessions || 0,
            averageScore: progressData.overall_average_score || 0,
            practiceMinutes: progressData.total_practice_minutes || 0,
            streak: progressData.streak || { current_streak: 0, longest_streak: 0 },
            weakPhonemes: progressData.current_weak_phonemes || [],
            strongPhonemes: progressData.current_strong_phonemes || [],
            scoreTrend: progressData.score_trend || 'insufficient_data',
        };
    }, [progressData]);

    // Generate sparkline data from history
    const sparklineData = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];
        return chartData.map(d => d.score);
    }, [chartData]);

    // Process session history from multiple sources
    const sessionHistory = useMemo(() => {
        // First try to use history data
        if (history) {
            const historyArray = Array.isArray(history) ? history : (history.results || history.data || []);
            if (Array.isArray(historyArray) && historyArray.length > 0) {
                return historyArray.slice(0, 10).map(item => ({
                    date: item.date,
                    score: item.average_score || 0,
                    attempts: item.attempts_count || item.attempts || 0,
                    duration: item.total_practice_minutes || item.duration || 0,
                }));
            }
        }

        // Fallback to recent_progress from progressData
        if (progressData && progressData.recent_progress && Array.isArray(progressData.recent_progress)) {
            return progressData.recent_progress.slice(0, 10).map(item => ({
                date: item.date,
                score: item.average_score || 0,
                attempts: item.attempts_count || item.attempts || 0,
                duration: item.total_practice_minutes || item.duration || 0,
            }));
        }

        return [];
    }, [history, progressData]);

    // Handle period change
    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
    };

    // Retry all data fetches
    const handleRetry = () => {
        refetchProgress();
        refetchHistory();
    };

    if (isLoading) {
        return <ProgressSkeleton />;
    }

    if (error) {
        return (
            <div className="progress-error">
                <ErrorState
                    icon="server"
                    title="Failed to load progress"
                    message="We could not load your progress data. Please try again."
                    onRetry={handleRetry}
                />
            </div>
        );
    }

    // Show empty state if no data
    const hasData = stats && stats.totalAttempts > 0;

    if (!hasData) {
        return (
            <div className="progress-empty">
                <NoProgress onStart={() => navigate('/practice')} />
            </div>
        );
    }

    return (
        <div className="progress">
            {/* Header */}
            <ProgressHeader trend={trend} />

            {/* Stats Overview Grid */}
            <StatsGrid
                stats={stats}
                sparklineData={sparklineData}
                trend={trend}
                sessionHistory={sessionHistory}
            />

            {/* Milestones & Achievements */}
            <Card variant="elevated" padding="lg" className="progress__chart-card progress__chart-card--full">
                <MilestonesBadges progressData={progressData} />
            </Card>


            {/* Main Content Grid */}
            <div className="progress__main-grid">
                {/* Score History Chart */}
                <Card variant="elevated" padding="lg" className="progress__chart-card progress__chart-card--full">
                    <ScoreHistoryChart
                        data={chartData}
                        period={period}
                        onPeriodChange={handlePeriodChange}
                    />
                </Card>

                {/* Session History */}
                <Card variant="elevated" padding="lg" className="progress__chart-card progress__chart-card--full">
                    <SessionHistoryCard
                        sessions={sessionHistory}
                        period={period}
                    />
                </Card>
            </div>
        </div>
    );
}

export default Progress;
