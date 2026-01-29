/**
 * Progress Page - Comprehensive Analytics Dashboard
 * Displays user's pronunciation improvement journey with detailed visualizations
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Zap } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { ENDPOINTS } from '../api/endpoints';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { NoProgress } from '../components/EmptyState';
import {
    ProgressHeader,
    StatsGrid,
    PhonemeMasterySection,
    ProgressSkeleton,
    SessionHistoryCard,
    ScoreHistoryChart,
    MilestonesBadges,
    PROGRESS_CONFIG
} from '../components/progress';
import './Progress.css';

export function Progress() {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('30');

    // Fetch all required data
    const { data: progressData, isLoading: progressLoading, error: progressError, refetch: refetchProgress } =
        useApi(ENDPOINTS.ANALYTICS.PROGRESS);
    const { data: history, isLoading: historyLoading, error: historyError, refetch: refetchHistory } =
        useApi(`${ENDPOINTS.ANALYTICS.HISTORY}?days=${period}`, { deps: [period] });
    const { data: phonemeStats, isLoading: phonemesLoading, error: phonemesError, refetch: refetchPhonemes } =
        useApi(ENDPOINTS.ANALYTICS.PHONEME_STATS);

    const isLoading = progressLoading || historyLoading || phonemesLoading;
    const error = progressError || historyError || phonemesError;

    // Process history data for chart
    const chartData = useMemo(() => {
        if (!history) return [];
        const historyArray = Array.isArray(history) ? history : (history.results || history.data || []);
        if (!Array.isArray(historyArray)) return [];

        return historyArray
            .map((item) => ({
                date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: Math.round((item.average_score || 0) * 100),
                attempts: item.attempts_count || item.attempts || 0,
            }))
            .reverse();
    }, [history]);

    // Process phoneme data for mastery section - use data from multiple sources
    const phonemeData = useMemo(() => {
        // Try phoneme-stats endpoint first
        if (phonemeStats && phonemeStats.by_type) {
            const byType = phonemeStats.by_type || {};
            const allPhonemes = [];

            Object.values(byType).forEach(phonemes => {
                if (Array.isArray(phonemes)) {
                    allPhonemes.push(...phonemes);
                }
            });

            if (allPhonemes.length > 0) {
                const sorted = allPhonemes.sort((a, b) => (a.current_score || 0) - (b.current_score || 0));
                const weak = sorted.filter(p => (p.current_score || 0) < 0.7);
                const strong = sorted.filter(p => (p.current_score || 0) >= 0.85);
                return { all: sorted, weak, strong };
            }
        }

        // Fallback to phoneme_progress from progressData
        if (progressData && progressData.phoneme_progress && Array.isArray(progressData.phoneme_progress)) {
            const allPhonemes = progressData.phoneme_progress.map(p => ({
                phoneme: p.phoneme?.arpabet || p.phoneme_arpabet || p.phoneme,
                symbol: p.phoneme?.symbol || p.phoneme_symbol || p.symbol,
                current_score: p.current_score || 0,
                attempts: p.attempts_count || p.attempts || 0,
                best_score: p.best_score || 0,
            }));

            const sorted = allPhonemes.sort((a, b) => (a.current_score || 0) - (b.current_score || 0));
            const weak = sorted.filter(p => (p.current_score || 0) < 0.7);
            const strong = sorted.filter(p => (p.current_score || 0) >= 0.85);
            return { all: sorted, weak, strong };
        }

        // Fallback to weak/strong phonemes lists from progressData
        if (progressData) {
            const weak = (progressData.current_weak_phonemes || []).map(p =>
                typeof p === 'string' ? { phoneme: p, symbol: p, current_score: 0.5, attempts: 0 } : p
            );
            const strong = (progressData.current_strong_phonemes || []).map(p =>
                typeof p === 'string' ? { phoneme: p, symbol: p, current_score: 0.9, attempts: 0 } : p
            );
            return { all: [...weak, ...strong], weak, strong };
        }

        return { all: [], weak: [], strong: [] };
    }, [phonemeStats, progressData]);

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
        refetchPhonemes();
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

                {/* Phoneme Mastery Section */}
                <Card variant="elevated" padding="lg" className="progress__chart-card">
                    <PhonemeMasterySection
                        phonemeData={phonemeData}
                        onViewAll={() => navigate('/phonemes')}
                    />
                </Card>

                {/* Session History */}
                <Card variant="elevated" padding="lg" className="progress__chart-card">
                    <SessionHistoryCard
                        sessions={sessionHistory}
                        period={period}
                    />
                </Card>

                {/* Practice Recommendations */}
                <Card variant="elevated" padding="lg" className="progress__chart-card progress__recommendations">
                    <div className="progress__chart-header">
                        <h2 className="progress__chart-title">
                            <Zap size={20} className="progress__title-icon" />
                            Focus Areas
                        </h2>
                    </div>
                    <div className="progress__recommendations-list">
                        {phonemeData.weak.length > 0 ? (
                            <>
                                <p className="progress__recommendations-intro">
                                    Based on your practice history, focus on these sounds:
                                </p>
                                <div className="progress__focus-phonemes">
                                    {phonemeData.weak.slice(0, 4).map((p, idx) => (
                                        <div key={idx} className="progress__focus-item">
                                            <span className="progress__focus-symbol">/{p.symbol || p.phoneme}/</span>
                                            <span className="progress__focus-score">
                                                {Math.round((p.current_score || 0) * 100)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className="progress__practice-btn"
                                    onClick={() => navigate('/practice')}
                                >
                                    <Mic size={18} />
                                    Practice These Sounds
                                </button>
                            </>
                        ) : (
                            <div className="progress__mastery-complete">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="progress__mastery-icon">
                                    <circle cx="12" cy="8" r="7" />
                                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                                </svg>
                                <p>Great job! You're performing well across all phonemes.</p>
                                <button
                                    className="progress__practice-btn"
                                    onClick={() => navigate('/practice')}
                                >
                                    <Mic size={18} />
                                    Continue Practice
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default Progress;
