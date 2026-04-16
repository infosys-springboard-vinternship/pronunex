/**
 * Admin Profile Page
 * System analytics dashboard + user management table
 * Protected: only is_staff users can access
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Shield, Users, Activity, Settings, ExternalLink,
    TrendingUp, Search, ChevronLeft, ChevronRight,
    BarChart2, UserCheck, UserX, Trash2, AlertTriangle,
    X, RefreshCw, ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, StatCard } from '../components/Card';
import { Spinner } from '../components/Loader';
import { api } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import './AdminProfile.css';

// Debounce helper
function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

export function AdminProfile() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Stats state
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Users state
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [totalUsers, setTotalUsers] = useState(0);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActive, setFilterActive] = useState(null);
    const [filterStaff, setFilterStaff] = useState(null);
    const [ordering, setOrdering] = useState('-created_at');

    // UI state
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);

    const debouncedSearch = useDebounce(searchQuery, 400);
    const PAGE_SIZE = 20;

    // Redirect non-admin users
    useEffect(() => {
        if (user && !user.is_staff) {
            navigate('/profile');
        }
    }, [user, navigate]);

    // Fetch system stats
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const response = await api.get(ENDPOINTS.ADMIN.STATS);
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch admin stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Fetch users with filters
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            let url = `${ENDPOINTS.ADMIN.USERS}?page=${page}&page_size=${PAGE_SIZE}&ordering=${ordering}`;
            if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
            if (filterActive !== null) url += `&is_active=${filterActive}`;
            if (filterStaff !== null) url += `&is_staff=${filterStaff}`;

            const response = await api.get(url);
            setUsers(response.data.results || []);
            setTotalUsers(response.data.count || 0);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('Failed to load users.');
        } finally {
            setUsersLoading(false);
        }
    }, [page, debouncedSearch, filterActive, filterStaff, ordering]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [debouncedSearch, filterActive, filterStaff, ordering]);

    // Toggle user active status
    const handleToggleActive = async (targetUser) => {
        if (targetUser.id === user.id) return;
        setActionLoading(targetUser.id);
        try {
            await api.patch(ENDPOINTS.ADMIN.USER_DETAIL(targetUser.id), {
                is_active: !targetUser.is_active,
            });
            fetchUsers();
            fetchStats();
        } catch (err) {
            setError(err.message || 'Failed to update user.');
        } finally {
            setActionLoading(null);
        }
    };

    // Toggle user admin status
    const handleToggleAdmin = async (targetUser) => {
        if (targetUser.id === user.id) return;
        setActionLoading(targetUser.id);
        try {
            await api.patch(ENDPOINTS.ADMIN.USER_DETAIL(targetUser.id), {
                is_staff: !targetUser.is_staff,
            });
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to update user.');
        } finally {
            setActionLoading(null);
        }
    };

    // Delete user
    const handleDeleteUser = async (targetUser) => {
        if (targetUser.id === user.id) return;
        setActionLoading(targetUser.id);
        try {
            await api.delete(ENDPOINTS.ADMIN.USER_DETAIL(targetUser.id));
            setDeleteConfirm(null);
            fetchUsers();
            fetchStats();
        } catch (err) {
            setError(err.message || 'Failed to delete user.');
        } finally {
            setActionLoading(null);
        }
    };

    // Toggle sort column
    const handleSort = (field) => {
        setOrdering(prev => prev === field ? `-${field}` : field);
    };

    const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

    if (!user || !user.is_staff) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Checking admin access...</p>
            </div>
        );
    }

    return (
        <div className="admin-profile">
            {/* Admin Banner */}
            <div className="admin-banner">
                <div className="admin-banner__content">
                    <Shield size={28} />
                    <div className="admin-banner__text">
                        <h2>Administrator Dashboard</h2>
                        <p>System analytics and user management</p>
                    </div>
                </div>
                <div className="admin-banner__actions">
                    <button
                        className="btn btn--sm admin-banner__refresh"
                        onClick={() => { fetchStats(); fetchUsers(); }}
                        title="Refresh data"
                    >
                        <RefreshCw size={16} />
                        <span>Refresh</span>
                    </button>
                    <a
                        href="/admin/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--sm admin-banner__link"
                    >
                        <Settings size={16} />
                        <span>Django Admin</span>
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {/* Error toast */}
            {error && (
                <div className="admin-error-toast">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X size={14} /></button>
                </div>
            )}

            {/* System Stats */}
            <section className="admin-stats">
                <h3 className="admin-section-title">System Overview</h3>
                {statsLoading ? (
                    <div className="admin-stats__loading"><Spinner size="md" /></div>
                ) : stats ? (
                    <div className="admin-stats__grid">
                        <StatCard
                            label="Total Users"
                            value={stats.total_users}
                            icon={Users}
                        />
                        <StatCard
                            label="Active Today"
                            value={stats.active_today}
                            icon={Activity}
                        />
                        <StatCard
                            label="Total Sessions"
                            value={stats.total_sessions}
                            icon={BarChart2}
                        />
                        <StatCard
                            label="Avg Score"
                            value={`${Math.round((stats.avg_score || 0) * 100)}%`}
                            icon={TrendingUp}
                        />
                    </div>
                ) : null}

                {/* Extra stats row */}
                {stats && (
                    <div className="admin-stats__extra">
                        <div className="admin-stat-badge">
                            <span className="admin-stat-badge__label">New this week</span>
                            <span className="admin-stat-badge__value">+{stats.new_users_this_week}</span>
                        </div>
                        <div className="admin-stat-badge">
                            <span className="admin-stat-badge__label">Total Attempts</span>
                            <span className="admin-stat-badge__value">{stats.total_attempts}</span>
                        </div>
                        {stats.level_distribution?.map(level => (
                            <div key={level.proficiency_level} className="admin-stat-badge">
                                <span className="admin-stat-badge__label">{level.proficiency_level}</span>
                                <span className="admin-stat-badge__value">{level.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* User Management */}
            <section className="admin-users">
                <div className="admin-users__header">
                    <h3 className="admin-section-title">User Management</h3>
                    <span className="admin-users__count">{totalUsers} users</span>
                </div>

                {/* Search & Filters */}
                <div className="admin-users__toolbar">
                    <div className="admin-users__search">
                        <Search size={16} className="admin-users__search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or username..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="admin-users__search-input"
                        />
                        {searchQuery && (
                            <button
                                className="admin-users__search-clear"
                                onClick={() => setSearchQuery('')}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="admin-users__filters">
                        <button
                            className={`admin-filter-btn ${filterActive === true ? 'active' : filterActive === false ? 'active--neg' : ''}`}
                            onClick={() => setFilterActive(prev => prev === true ? null : true)}
                        >
                            <UserCheck size={14} />
                            Active
                        </button>
                        <button
                            className={`admin-filter-btn ${filterActive === false ? 'active' : ''}`}
                            onClick={() => setFilterActive(prev => prev === false ? null : false)}
                        >
                            <UserX size={14} />
                            Inactive
                        </button>
                        <button
                            className={`admin-filter-btn ${filterStaff === true ? 'active' : ''}`}
                            onClick={() => setFilterStaff(prev => prev === true ? null : true)}
                        >
                            <Shield size={14} />
                            Admins
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                <div className="admin-users__table-wrap">
                    {usersLoading ? (
                        <div className="admin-users__loading"><Spinner size="md" /></div>
                    ) : users.length === 0 ? (
                        <div className="admin-users__empty">
                            <Users size={32} />
                            <p>No users found</p>
                        </div>
                    ) : (
                        <table className="admin-users__table">
                            <thead>
                                <tr>
                                    <th className="admin-th--sortable" onClick={() => handleSort('full_name')}>
                                        User
                                        <ArrowUpDown size={12} />
                                    </th>
                                    <th className="admin-th--sortable" onClick={() => handleSort('email')}>
                                        Email
                                        <ArrowUpDown size={12} />
                                    </th>
                                    <th>Level</th>
                                    <th>Sessions</th>
                                    <th>Avg Score</th>
                                    <th>Status</th>
                                    <th className="admin-th--sortable" onClick={() => handleSort('last_login')}>
                                        Last Login
                                        <ArrowUpDown size={12} />
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const isSelf = u.id === user.id;
                                    return (
                                        <tr key={u.id} className={isSelf ? 'admin-tr--self' : ''}>
                                            <td>
                                                <div className="admin-user-cell">
                                                    <span className="admin-user-cell__name">{u.full_name || u.username}</span>
                                                    {u.is_staff && (
                                                        <span className="admin-badge admin-badge--staff">Admin</span>
                                                    )}
                                                    {isSelf && (
                                                        <span className="admin-badge admin-badge--you">You</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="admin-td--email">{u.email}</td>
                                            <td>
                                                <span className={`admin-level admin-level--${u.proficiency_level}`}>
                                                    {u.proficiency_level}
                                                </span>
                                            </td>
                                            <td className="admin-td--num">{u.sessions_count}</td>
                                            <td className="admin-td--num">
                                                {u.avg_score != null ? `${Math.round(u.avg_score * 100)}%` : '—'}
                                            </td>
                                            <td>
                                                <span className={`admin-status ${u.is_active ? 'admin-status--active' : 'admin-status--inactive'}`}>
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="admin-td--date">
                                                {u.last_login
                                                    ? new Date(u.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                                                    : 'Never'}
                                            </td>
                                            <td>
                                                <div className="admin-actions-cell">
                                                    {actionLoading === u.id ? (
                                                        <Spinner size="sm" />
                                                    ) : (
                                                        <>
                                                            <button
                                                                className={`admin-action-btn ${u.is_active ? 'admin-action-btn--warn' : 'admin-action-btn--success'}`}
                                                                onClick={() => handleToggleActive(u)}
                                                                disabled={isSelf}
                                                                title={u.is_active ? 'Deactivate user' : 'Activate user'}
                                                            >
                                                                {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                                            </button>
                                                            <button
                                                                className={`admin-action-btn ${u.is_staff ? 'admin-action-btn--active' : ''}`}
                                                                onClick={() => handleToggleAdmin(u)}
                                                                disabled={isSelf}
                                                                title={u.is_staff ? 'Remove admin' : 'Make admin'}
                                                            >
                                                                <Shield size={14} />
                                                            </button>
                                                            <button
                                                                className="admin-action-btn admin-action-btn--danger"
                                                                onClick={() => setDeleteConfirm(u)}
                                                                disabled={isSelf}
                                                                title="Delete user"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="admin-users__pagination">
                        <button
                            className="admin-page-btn"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="admin-page-info">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="admin-page-btn"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </section>

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="admin-modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal__icon">
                            <AlertTriangle size={32} />
                        </div>
                        <h3>Delete User</h3>
                        <p>
                            Are you sure you want to permanently delete
                            <strong> {deleteConfirm.full_name || deleteConfirm.email}</strong>?
                            This will remove all their practice data, sessions, and progress. This action cannot be undone.
                        </p>
                        <div className="admin-modal__actions">
                            <button
                                className="btn btn--secondary"
                                onClick={() => setDeleteConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn admin-modal__delete-btn"
                                onClick={() => handleDeleteUser(deleteConfirm)}
                                disabled={actionLoading === deleteConfirm.id}
                            >
                                {actionLoading === deleteConfirm.id ? <Spinner size="sm" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AdminProfile;
