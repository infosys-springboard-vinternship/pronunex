import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, Activity, TrendingUp, Target } from 'lucide-react';
import { Card, StatCard } from '../../components/Card';
import { Spinner } from '../../components/Loader';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from '../../api/client';
import './AdminUserDetail.css';

export function AdminUserDetail() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserDetail();
    }, [userId]);

    const fetchUserDetail = async () => {
        try {
            const response = await apiClient.get(`/admin/users/${userId}/`);
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user details:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Loading user details...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="admin-loading">
                <p>User not found</p>
                <button className="btn btn--primary" onClick={() => navigate('/admin/users')}>
                    Back to Users
                </button>
            </div>
        );
    }

    return (
        <div className="admin-user-detail">
            <button className="back-button" onClick={() => navigate('/admin/users')}>
                <ArrowLeft size={18} />
                Back to Users
            </button>

            <div className="user-profile-card">
                <div className="user-profile-avatar">
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-profile-info">
                    <h1 className="user-profile-name">{user.full_name || 'Unknown User'}</h1>
                    <div className="user-profile-meta">
                        <span className="meta-item">
                            <Mail size={16} />
                            {user.email}
                        </span>
                        <span className="meta-item">
                            <Calendar size={16} />
                            Joined {new Date(user.created_at).toLocaleDateString()}
                        </span>
                        <span className="meta-item">
                            <Activity size={16} />
                            Last active: {user.last_activity || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="user-stats-grid">
                <StatCard
                    label="Total Attempts"
                    value={user.total_attempts || 0}
                    icon={Target}
                />
                <StatCard
                    label="Avg Accuracy"
                    value={`${Math.round((user.avg_accuracy || 0) * 100)}%`}
                    icon={TrendingUp}
                />
                <StatCard
                    label="Total Sessions"
                    value={user.total_sessions || 0}
                    icon={Activity}
                />
                <StatCard
                    label="Practice Minutes"
                    value={user.total_minutes || 0}
                    icon={Calendar}
                />
            </div>

            <div className="detail-grid">
                <Card className="detail-card">
                    <h3 className="detail-card__title">Accuracy Trend</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={user.accuracy_trend || []}>
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
                                <Line type="monotone" dataKey="accuracy" stroke="var(--color-primary-500)" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="detail-card">
                    <h3 className="detail-card__title">Weak Phonemes (Top 5)</h3>
                    <div className="weak-phonemes-list">
                        {(user.weak_phonemes || []).slice(0, 5).map((phoneme, index) => (
                            <div key={index} className="weak-phoneme-item">
                                <span className="phoneme-rank">#{index + 1}</span>
                                <span className="phoneme-symbol">{phoneme.symbol}</span>
                                <div className="phoneme-bar">
                                    <div
                                        className="phoneme-bar-fill"
                                        style={{ width: `${phoneme.accuracy * 100}%` }}
                                    ></div>
                                </div>
                                <span className="phoneme-accuracy">{Math.round(phoneme.accuracy * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <Card className="recent-attempts-card">
                <h3 className="detail-card__title">Recent Attempts</h3>
                <div className="attempts-table">
                    {(user.recent_attempts || []).length === 0 ? (
                        <div className="empty-state">
                            <p>No attempts yet</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Sentence</th>
                                    <th>Accuracy</th>
                                    <th>PER</th>
                                    <th>Tier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {user.recent_attempts.map((attempt, index) => (
                                    <tr key={index}>
                                        <td>{new Date(attempt.timestamp).toLocaleDateString()}</td>
                                        <td className="sentence-cell">{attempt.sentence}</td>
                                        <td>{Math.round(attempt.accuracy * 100)}%</td>
                                        <td>{attempt.per.toFixed(2)}</td>
                                        <td>
                                            <span className={`tier-badge tier-badge--${attempt.tier.toLowerCase()}`}>
                                                {attempt.tier}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
}

export default AdminUserDetail;
