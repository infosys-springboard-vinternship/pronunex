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
    X, RefreshCw, ArrowUpDown, Radio
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

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState(null);
    const [confirmInput, setConfirmInput] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);

    const debouncedSearch = useDebounce(searchQuery, 400);
    const PAGE_SIZE = 20;

    // Redirect non-admin users
    useEffect(() => {
        if (user && !user.is_staff) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await api.get(ENDPOINTS.ADMIN.STATS);
            setStats(res.data || res);
        } catch (err) {
            console.error('Failed to fetch admin stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                page_size: PAGE_SIZE,
                ordering,
            });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (filterActive !== null) params.set('is_active', filterActive);
            if (filterStaff !== null) params.set('is_staff', filterStaff);

            const res = await api.get(`${ENDPOINTS.ADMIN.USERS}?${params}`);
            const data = res.data || res;
            setUsers(data.results || []);
            setTotalUsers(data.count || 0);
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

    // --- Confirmation Modal Helpers ---

    const openConfirm = (type, targetUser) => {
        setConfirmInput('');
        setConfirmModal({ type, targetUser });
    };

    const closeConfirm = () => {
        setConfirmModal(null);
        setConfirmInput('');
    };

    // Execute confirmed action
    const executeAction = async () => {
        if (!confirmModal) return;
        const { type, targetUser } = confirmModal;
        setActionLoading(targetUser.id);
        try {
            if (type === 'delete') {
                await api.delete(ENDPOINTS.ADMIN.USER_DETAIL(targetUser.id));
                fetchUsers();
                fetchStats();
            } else if (type === 'toggle_active') {
                await api.patch(ENDPOINTS.ADMIN.USER_DETAIL(targetUser.id), {
                    is_active: !targetUser.is_active,
                });
                fetchUsers();
                fetchStats();
            } else if (type === 'toggle_admin') {
                await api.patch(ENDPOINTS.ADMIN.USER_DETAIL(targetUser.id), {
                    is_staff: !targetUser.is_staff,
                });
                fetchUsers();
            }
            closeConfirm();
        } catch (err) {
            setError(err.message || 'Action failed.');
        } finally {
            setActionLoading(null);
        }
    };

    // Check if confirm button should be enabled
    const isConfirmEnabled = () => {
        if (!confirmModal) return false;
        if (actionLoading) return false;
        // Delete requires typing the email
        if (confirmModal.type === 'delete') {
            return confirmInput === confirmModal.targetUser.email;
        }
        return true;
    };

    // Get modal content based on action type
    const getModalContent = () => {
        if (!confirmModal) return {};
        const { type, targetUser } = confirmModal;
        const name = targetUser.full_name || targetUser.email;

        if (type === 'delete') {
            return {
                icon: Trash2,
                iconClass: 'admin-modal__icon--danger',
                title: 'Delete User Permanently',
                description: (
                    <>
                        You are about to permanently delete <strong>{name}</strong>.
                        This will remove all their practice data, sessions, and progress.
                        <strong> This action cannot be undone.</strong>
                    </>
                ),
                requiresInput: true,
                inputLabel: `Type "${targetUser.email}" to confirm:`,
                inputPlaceholder: targetUser.email,
                confirmText: 'Delete Permanently',
                confirmClass: 'admin-modal__btn--danger',
            };
        }

        if (type === 'toggle_admin') {
            const granting = !targetUser.is_staff;
            return {
                icon: Shield,
                iconClass: granting ? 'admin-modal__icon--warning' : 'admin-modal__icon--info',
                title: granting ? 'Grant Admin Privileges' : 'Revoke Admin Privileges',
                description: granting ? (
                    <>
                        You are about to make <strong>{name}</strong> an administrator.
                        They will have full access to manage users, view system analytics,
                        and perform administrative actions.
                    </>
                ) : (
                    <>
                        You are about to revoke admin privileges from <strong>{name}</strong>.
                        They will lose access to the admin dashboard and user management.
                    </>
                ),
                requiresInput: false,
                confirmText: granting ? 'Grant Admin' : 'Revoke Admin',
                confirmClass: granting ? 'admin-modal__btn--warning' : 'admin-modal__btn--info',
            };
        }

        if (type === 'toggle_active') {
            const deactivating = targetUser.is_active;
            return {
                icon: deactivating ? UserX : UserCheck,
                iconClass: deactivating ? 'admin-modal__icon--warning' : 'admin-modal__icon--success',
                title: deactivating ? 'Deactivate User' : 'Reactivate User',
                description: deactivating ? (
                    <>
                        You are about to deactivate <strong>{name}</strong>.
                        They will be unable to log in or use the platform until reactivated.
                    </>
                ) : (
                    <>
                        You are about to reactivate <strong>{name}</strong>.
                        They will regain full access to the platform.
                    </>
                ),
                requiresInput: false,
                confirmText: deactivating ? 'Deactivate' : 'Reactivate',
                confirmClass: deactivating ? 'admin-modal__btn--warning' : 'admin-modal__btn--success',
            };
        }

        return {};
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

    const modalContent = getModalContent();
    const ModalIcon = modalContent.icon;

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
                            label="Online Now"
                            value={stats.online_now || 0}
                            icon={Radio}
                            accent="live"
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
                            className={`admin-filter-btn ${filterActive === 'true' ? 'active' : ''}`}
                            onClick={() => setFilterActive(prev => prev === 'true' ? null : 'true')}
                        >
                            <UserCheck size={14} /> Active
                        </button>
                        <button
                            className={`admin-filter-btn ${filterActive === 'false' ? 'active active--neg' : ''}`}
                            onClick={() => setFilterActive(prev => prev === 'false' ? null : 'false')}
                        >
                            <UserX size={14} /> Inactive
                        </button>
                        <button
                            className={`admin-filter-btn ${filterStaff === 'true' ? 'active' : ''}`}
                            onClick={() => setFilterStaff(prev => prev === 'true' ? null : 'true')}
                        >
                            <Shield size={14} /> Admins
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
                                    <th>
                                        <span className="admin-th--sortable" onClick={() => handleSort('full_name')}>
                                            User {ordering.includes('full_name') && <ArrowUpDown size={12} />}
                                        </span>
                                        <br />
                                        <span className="admin-th--sortable" onClick={() => handleSort('email')}>
                                            Email {ordering.includes('email') && <ArrowUpDown size={12} />}
                                        </span>
                                    </th>
                                    <th>Level</th>
                                    <th>Sessions</th>
                                    <th>Avg Score</th>
                                    <th>Status</th>
                                    <th>
                                        <span className="admin-th--sortable" onClick={() => handleSort('last_login')}>
                                            Last Login {ordering.includes('last_login') && <ArrowUpDown size={12} />}
                                        </span>
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const isSelf = u.id === user.id;
                                    return (
                                        <tr
                                            key={u.id}
                                            className={isSelf ? 'admin-tr--self' : ''}
                                        >
                                            <td>
                                                <div className="admin-user-cell">
                                                    <span className="admin-user-cell__name">
                                                        {u.full_name || u.username}
                                                    </span>
                                                    {u.is_staff && <span className="admin-badge admin-badge--staff">Admin</span>}
                                                    {isSelf && <span className="admin-badge admin-badge--you">You</span>}
                                                </div>
                                                <div className="admin-td--email">{u.email}</div>
                                            </td>
                                            <td>
                                                <span className={`admin-level admin-level--${u.proficiency_level}`}>
                                                    {u.proficiency_level}
                                                </span>
                                            </td>
                                            <td className="admin-td--num">{u.sessions_count}</td>
                                            <td className="admin-td--num">
                                                {u.avg_score != null ? `${Math.round(u.avg_score * 100)}%` : '–'}
                                            </td>
                                            <td>
                                                <span className={`admin-status admin-status--${u.is_active ? 'active' : 'inactive'}`}>
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
                                                                onClick={() => openConfirm('toggle_active', u)}
                                                                disabled={isSelf}
                                                                title={u.is_active ? 'Deactivate user' : 'Activate user'}
                                                            >
                                                                {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                                            </button>
                                                            <button
                                                                className={`admin-action-btn ${u.is_staff ? 'admin-action-btn--active' : ''}`}
                                                                onClick={() => openConfirm('toggle_admin', u)}
                                                                disabled={isSelf}
                                                                title={u.is_staff ? 'Remove admin' : 'Make admin'}
                                                            >
                                                                <Shield size={14} />
                                                            </button>
                                                            <button
                                                                className="admin-action-btn admin-action-btn--danger"
                                                                onClick={() => openConfirm('delete', u)}
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

            {/* Unified Confirmation Modal */}
            {confirmModal && (
                <div className="admin-modal-overlay" onClick={closeConfirm}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className={`admin-modal__icon ${modalContent.iconClass || ''}`}>
                            {ModalIcon && <ModalIcon size={32} />}
                        </div>
                        <h3>{modalContent.title}</h3>
                        <p>{modalContent.description}</p>

                        {modalContent.requiresInput && (
                            <div className="admin-modal__input-group">
                                <label className="admin-modal__input-label">
                                    {modalContent.inputLabel}
                                </label>
                                <input
                                    type="text"
                                    className="admin-modal__input"
                                    placeholder={modalContent.inputPlaceholder}
                                    value={confirmInput}
                                    onChange={e => setConfirmInput(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="admin-modal__actions">
                            <button
                                className="btn btn--secondary"
                                onClick={closeConfirm}
                            >
                                Cancel
                            </button>
                            <button
                                className={`btn ${modalContent.confirmClass || 'admin-modal__btn--danger'}`}
                                onClick={executeAction}
                                disabled={!isConfirmEnabled()}
                            >
                                {actionLoading ? <Spinner size="sm" /> : modalContent.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AdminProfile;
