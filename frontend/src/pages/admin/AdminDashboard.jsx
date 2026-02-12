import { useState, useEffect } from 'react';
import {
    Users, Activity, FileText, BarChart3, Settings2, AlertCircle,
    TrendingUp, Clock, Target
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, StatCard } from '../../components/Card';
import { Spinner } from '../../components/Loader';
import apiClient from '../../api/client';
import ENDPOINTS from '../../api/endpoints';
import './AdminDashboard.css';

export function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [systemStatus, setSystemStatus] = useState('OK');

    useEffect(() => {
        if (user && !user.is_staff) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        fetchAdminStats();
    }, []);

    const fetchAdminStats = async () => {
        try {
            const response = await apiClient.get(ENDPOINTS.ADMIN.STATS);
            setStats(response.data);
            setSystemStatus(response.data.system_status || 'OK');
        } catch (error) {
            console.error('Failed to fetch admin stats:', error);
            setStats({
                total_users: 0,
                active_users: 0,
                total_attempts: 0,
                avg_accuracy: 0,
                avg_per: 0
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user || !user.is_staff) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Checking admin access...</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">Admin Dashboard</h1>
                    <p className="admin-subtitle">Monitor Pronunex system health and performance</p>
                </div>
                <div className={`system-status system-status--${systemStatus.toLowerCase()}`}>
                    <div className="status-dot"></div>
                    <span>System: {systemStatus}</span>
                </div>
            </div>

            <div className="admin-stats-grid">
                <StatCard
                    label="Total Users"
                    value={stats.total_users || 0}
                    icon={Users}
                />
                <StatCard
                    label="Active Users (7d)"
                    value={stats.active_users || 0}
                    icon={Activity}
                />
                <StatCard
                    label="Total Attempts"
                    value={stats.total_attempts || 0}
                    icon={Target}
                />
                <StatCard
                    label="Avg Accuracy"
                    value={`${Math.round((stats.avg_accuracy || 0) * 100)}%`}
                    icon={TrendingUp}
                />
                <StatCard
                    label="Avg PER"
                    value={(stats.avg_per || 0).toFixed(2)}
                    icon={BarChart3}
                />
                <StatCard
                    label="Last Updated"
                    value={new Date().toLocaleTimeString()}
                    icon={Clock}
                />
            </div>

            <div className="admin-nav-grid">
                <Card hover className="admin-nav-card" onClick={() => navigate('/admin/users')}>
                    <div className="admin-nav-card__icon admin-nav-card__icon--primary">
                        <Users size={28} />
                    </div>
                    <h3>Users</h3>
                    <p>View and manage user accounts</p>
                </Card>

                <Card hover className="admin-nav-card" onClick={() => navigate('/admin/sentences')}>
                    <div className="admin-nav-card__icon admin-nav-card__icon--success">
                        <FileText size={28} />
                    </div>
                    <h3>Sentence Bank</h3>
                    <p>Manage practice sentences</p>
                </Card>

                <Card hover className="admin-nav-card" onClick={() => navigate('/admin/analytics')}>
                    <div className="admin-nav-card__icon admin-nav-card__icon--warning">
                        <BarChart3 size={28} />
                    </div>
                    <h3>Analytics</h3>
                    <p>View global insights</p>
                </Card>

                <Card hover className="admin-nav-card" onClick={() => navigate('/admin/scoring')}>
                    <div className="admin-nav-card__icon admin-nav-card__icon--info">
                        <Settings2 size={28} />
                    </div>
                    <h3>Scoring Config</h3>
                    <p>Adjust scoring parameters</p>
                </Card>

                <Card hover className="admin-nav-card" onClick={() => navigate('/admin/logs')}>
                    <div className="admin-nav-card__icon admin-nav-card__icon--error">
                        <AlertCircle size={28} />
                    </div>
                    <h3>Logs & Health</h3>
                    <p>System logs and errors</p>
                </Card>
            </div>
        </div>
    );
}

export default AdminDashboard;
