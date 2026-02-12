import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Loader';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './AdminAnalytics.css';

export function AdminAnalytics() {
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await apiClient.get(ENDPOINTS.ADMIN.ANALYTICS);
            setAnalytics(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            setAnalytics({
                weak_phonemes: [],
                accuracy_trend: [],
                failed_words: [],
                per_distribution: []
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="admin-analytics">
            <div className="admin-analytics__header">
                <div>
                    <h1 className="admin-title">Global Analytics</h1>
                    <p className="admin-subtitle">System-wide insights and trends</p>
                </div>
                <button className="btn btn--secondary" onClick={() => navigate('/admin')}>
                    Back to Dashboard
                </button>
            </div>

            <div className="analytics-grid">
                <Card className="chart-card">
                    <div className="chart-header">
                        <div className="chart-title">
                            <TrendingDown size={20} />
                            <h3>Most Weak Phonemes</h3>
                        </div>
                        <p className="chart-subtitle">Top 10 phonemes with lowest accuracy</p>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.weak_phonemes || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                                <XAxis dataKey="phoneme" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                />
                                <Bar dataKey="avg_accuracy" fill="var(--color-error-500)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="chart-card">
                    <div className="chart-header">
                        <div className="chart-title">
                            <BarChart3 size={20} />
                            <h3>Accuracy Over Time</h3>
                        </div>
                        <p className="chart-subtitle">30-day trend</p>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.accuracy_trend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                                <XAxis dataKey="date" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                />
                                <Line type="monotone" dataKey="avg_accuracy" stroke="var(--color-primary-500)" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="chart-card">
                    <div className="chart-header">
                        <div className="chart-title">
                            <AlertTriangle size={20} />
                            <h3>Most Failed Words</h3>
                        </div>
                        <p className="chart-subtitle">Words with highest error rates</p>
                    </div>
                    <div className="failed-words-list">
                        {(analytics.failed_words || []).slice(0, 10).map((item, index) => (
                            <div key={index} className="failed-word-item">
                                <span className="word-rank">#{index + 1}</span>
                                <span className="word-text">{item.word}</span>
                                <span className="word-count">{item.count} failures</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="chart-card">
                    <div className="chart-header">
                        <div className="chart-title">
                            <BarChart3 size={20} />
                            <h3>PER Distribution</h3>
                        </div>
                        <p className="chart-subtitle">Phoneme Error Rate across users</p>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.per_distribution || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                                <XAxis dataKey="range" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                />
                                <Bar dataKey="count" fill="var(--color-primary-500)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default AdminAnalytics;
