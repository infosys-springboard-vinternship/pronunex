import { useState, useEffect } from 'react';
import { Search, UserX, UserCheck, RotateCcw, ChevronRight, Mail, Calendar, Activity, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Loader';
import apiClient from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './AdminUsers.css';

export function AdminUsers() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalAll, setTotalAll] = useState(0);
    const [totalActive, setTotalActive] = useState(0);
    const [totalDisabled, setTotalDisabled] = useState(0);

    useEffect(() => {
        fetchUsers();
    }, [page, filter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (searchTerm) params.append('search', searchTerm);
            if (filter === 'active') params.append('status', 'active');
            if (filter === 'inactive') params.append('status', 'disabled');

            const response = await apiClient.get(`${ENDPOINTS.ADMIN.USERS}?${params}`);
            setUsers(response.data.users || []);
            setTotalPages(response.data.pages || 1);
            setTotal(response.data.total || 0);
            setTotalAll(response.data.total_all || 0);
            setTotalActive(response.data.total_active || 0);
            setTotalDisabled(response.data.total_disabled || 0);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchUsers();
    };

    const handleDisableUser = async (userId) => {
        if (!confirm('Are you sure you want to disable this user?')) return;

        try {
            await apiClient.post(ENDPOINTS.ADMIN.USER_DISABLE(userId));
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to disable user');
        }
    };

    const handleEnableUser = async (userId) => {
        if (!confirm('Are you sure you want to re-enable this user?')) return;

        try {
            await apiClient.post(ENDPOINTS.ADMIN.USER_ENABLE(userId));
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to enable user');
        }
    };

    const handleResetProgress = async (userId) => {
        if (!confirm('Are you sure you want to reset this user\'s progress? This cannot be undone.')) return;

        try {
            await apiClient.post(ENDPOINTS.ADMIN.USER_RESET(userId));
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to reset progress');
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Loading users...</p>
            </div>
        );
    }

    return (
        <div className="admin-users">
            <div className="admin-users__header">
                <div>
                    <h1 className="admin-title">User Management</h1>
                    <p className="admin-subtitle">
                        View and manage user accounts
                        <span className="total-count"> ({totalAll} total)</span>
                    </p>
                </div>
                <button className="btn btn--secondary" onClick={() => navigate('/admin')}>
                    Back to Dashboard
                </button>
            </div>

            <Card className="admin-users__controls">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="search-input"
                    />
                </div>
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`}
                        onClick={() => { setFilter('all'); setPage(1); }}
                    >
                        All ({totalAll})
                    </button>
                    <button
                        className={`filter-tab ${filter === 'active' ? 'filter-tab--active' : ''}`}
                        onClick={() => { setFilter('active'); setPage(1); }}
                    >
                        Active ({totalActive})
                    </button>
                    <button
                        className={`filter-tab ${filter === 'inactive' ? 'filter-tab--active' : ''}`}
                        onClick={() => { setFilter('inactive'); setPage(1); }}
                    >
                        Disabled ({totalDisabled})
                    </button>
                </div>
            </Card>

            <div className="users-list">
                {users.length === 0 ? (
                    <Card className="empty-state">
                        <p>No users found</p>
                    </Card>
                ) : (
                    users.map(user => (
                        <Card key={user.id} hover className={`user-card ${!user.is_active ? 'user-card--disabled' : ''}`}>
                            <div className="user-card__info">
                                <div className="user-avatar">
                                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="user-details">
                                    <h3 className="user-name">
                                        {user.full_name || 'Unknown User'}
                                        {!user.is_active && <span className="status-badge status-badge--disabled">Disabled</span>}
                                        {user.is_staff && <span className="status-badge status-badge--admin">Admin</span>}
                                    </h3>
                                    <div className="user-meta">
                                        <span className="user-meta-item">
                                            <Mail size={14} />
                                            {user.email}
                                        </span>
                                        <span className="user-meta-item">
                                            <Calendar size={14} />
                                            Joined {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="user-meta-item">
                                            <Activity size={14} />
                                            Last active: {user.last_activity || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="user-card__stats">
                                <div className="user-stat">
                                    <span className="user-stat__value">{Math.round((user.avg_accuracy || 0) * 100)}%</span>
                                    <span className="user-stat__label">Avg Accuracy</span>
                                </div>
                                <div className="user-stat">
                                    <span className="user-stat__value">{user.total_attempts || 0}</span>
                                    <span className="user-stat__label">Attempts</span>
                                </div>
                            </div>

                            <div className="user-card__actions">
                                <button
                                    className="btn-icon btn-icon--primary"
                                    onClick={() => navigate(`/admin/users/${user.id}`)}
                                    title="View Details"
                                >
                                    <ChevronRight size={18} />
                                </button>
                                <button
                                    className="btn-icon btn-icon--warning"
                                    onClick={() => handleResetProgress(user.id)}
                                    title="Reset Progress"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                {user.is_active ? (
                                    <button
                                        className="btn-icon btn-icon--error"
                                        onClick={() => handleDisableUser(user.id)}
                                        title="Disable User"
                                    >
                                        <UserX size={18} />
                                    </button>
                                ) : (
                                    <button
                                        className="btn-icon btn-icon--success"
                                        onClick={() => handleEnableUser(user.id)}
                                        title="Enable User"
                                    >
                                        <UserCheck size={18} />
                                    </button>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn btn--secondary btn--sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="pagination__info">Page {page} of {totalPages}</span>
                    <button
                        className="btn btn--secondary btn--sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default AdminUsers;
