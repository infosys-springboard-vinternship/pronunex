import { useState, useEffect } from 'react';
import { AlertCircle, XCircle, RefreshCw, Clock, Shield, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, StatCard } from '../../components/Card';
import { Spinner } from '../../components/Loader';
import apiClient from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './AdminLogs.css';

export function AdminLogs() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchLogs();
    }, [page, typeFilter, severityFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page });
            if (typeFilter) params.append('type', typeFilter);
            if (severityFilter) params.append('severity', severityFilter);

            const response = await apiClient.get(`${ENDPOINTS.ADMIN.LOGS}?${params}`);
            setLogs(response.data.logs || []);
            setHealth(response.data.health || {});
            setTotalPages(response.data.pages || 1);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            setLogs([]);
            setHealth({
                stt_failures: 0,
                alignment_failures: 0,
                tts_failures: 0,
                llm_failures: 0,
                security_events: 0,
                total_errors: 0,
                total_warnings: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'security':
                return <Shield size={16} />;
            case 'admin_action':
                return <Settings size={16} />;
            case 'stt_error':
            case 'alignment_error':
                return <AlertCircle size={16} />;
            default:
                return <XCircle size={16} />;
        }
    };

    const getSeverityClass = (severity) => {
        switch (severity) {
            case 'critical': return 'log-item--critical';
            case 'error': return 'log-item--error';
            case 'warning': return 'log-item--warning';
            case 'info': return 'log-item--info';
            default: return '';
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Loading logs...</p>
            </div>
        );
    }

    return (
        <div className="admin-logs">
            <div className="admin-logs__header">
                <div>
                    <h1 className="admin-title">Logs & System Health</h1>
                    <p className="admin-subtitle">
                        Monitor system errors and performance
                        <span className="total-count"> ({total} total logs)</span>
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn btn--secondary" onClick={() => { setPage(1); fetchLogs(); }}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                    <button className="btn btn--secondary" onClick={() => navigate('/admin')}>
                        Back
                    </button>
                </div>
            </div>

            <div className="health-stats">
                <StatCard
                    label="Total Errors (24h)"
                    value={health?.total_errors || 0}
                    icon={XCircle}
                />
                <StatCard
                    label="STT Failures"
                    value={health?.stt_failures || 0}
                    icon={AlertCircle}
                />
                <StatCard
                    label="Alignment Failures"
                    value={health?.alignment_failures || 0}
                    icon={AlertCircle}
                />
                <StatCard
                    label="Security Events"
                    value={health?.security_events || 0}
                    icon={Shield}
                />
                <StatCard
                    label="TTS Failures"
                    value={health?.tts_failures || 0}
                    icon={AlertCircle}
                />
                <StatCard
                    label="Warnings"
                    value={health?.total_warnings || 0}
                    icon={Clock}
                />
            </div>

            <Card className="logs-controls">
                <div className="filter-row">
                    <div className="filter-group">
                        <label className="filter-label">Type:</label>
                        <select
                            className="filter-select"
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Types</option>
                            <option value="stt_error">STT Errors</option>
                            <option value="alignment_error">Alignment Errors</option>
                            <option value="tts_error">TTS Errors</option>
                            <option value="llm_error">LLM Errors</option>
                            <option value="system_error">System Errors</option>
                            <option value="security">Security Events</option>
                            <option value="admin_action">Admin Actions</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Severity:</label>
                        <select
                            className="filter-select"
                            value={severityFilter}
                            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="error">Error</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="logs-container">
                <h3 className="logs-title">System Logs</h3>
                <div className="logs-list">
                    {logs.length === 0 ? (
                        <div className="empty-state">
                            <p>No logs found for the selected filters</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className={`log-item ${getSeverityClass(log.severity)}`}>
                                <div className="log-item__icon">
                                    {getLogIcon(log.type)}
                                </div>
                                <div className="log-item__content">
                                    <div className="log-item__header">
                                        <span className="log-type">{log.type.replace(/_/g, ' ').toUpperCase()}</span>
                                        <span className={`severity-badge severity-badge--${log.severity}`}>
                                            {log.severity}
                                        </span>
                                        <span className="log-time">
                                            {new Date(log.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="log-message">{log.message}</div>
                                    {log.user && (
                                        <div className="log-user">User: {log.user}</div>
                                    )}
                                    {log.ip_address && (
                                        <div className="log-ip">IP: {log.ip_address}</div>
                                    )}
                                    {log.details && (
                                        <div className="log-details">
                                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

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

export default AdminLogs;
