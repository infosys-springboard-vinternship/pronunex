import { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertTriangle, Clock, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Loader';
import apiClient from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './AdminScoring.css';

export function AdminScoring() {
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [updatedBy, setUpdatedBy] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [reason, setReason] = useState('');

    // History panel
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [rollingBack, setRollingBack] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await apiClient.get(ENDPOINTS.ADMIN.SCORING);
            setConfig(response.data.config);
            setLastUpdated(response.data.last_updated);
            setUpdatedBy(response.data.updated_by);
        } catch (error) {
            console.error('Failed to fetch scoring config:', error);
            setConfig({
                tier_thresholds: {
                    excellent: 0.9,
                    good: 0.75,
                    fair: 0.6,
                    poor: 0.0
                },
                per_cutoffs: {
                    excellent: 0.1,
                    good: 0.25,
                    fair: 0.4,
                    poor: 0.6
                },
                weak_phoneme_threshold: 0.7,
                accuracy_weight: 0.7,
                fluency_weight: 0.3
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const response = await apiClient.get(ENDPOINTS.ADMIN.SCORING_HISTORY);
            setHistory(response.data.history || []);
        } catch (error) {
            console.error('Failed to fetch scoring history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSave = async () => {
        setShowWarning(true);
    };

    const confirmSave = async () => {
        setSaving(true);
        try {
            await apiClient.post(ENDPOINTS.ADMIN.SCORING, {
                ...config,
                reason: reason || 'Manual config update'
            });
            setLastUpdated(new Date().toISOString());
            setShowWarning(false);
            setReason('');
            if (showHistory) fetchHistory();
        } catch (error) {
            console.error('Failed to save scoring config:', error);
            alert(error.response?.data?.error || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleRollback = async (historyId) => {
        if (!confirm('Rollback to this configuration? Current config will be saved as a snapshot first.')) return;

        setRollingBack(true);
        try {
            await apiClient.post(ENDPOINTS.ADMIN.SCORING_ROLLBACK, { history_id: historyId });
            await fetchConfig();
            await fetchHistory();
        } catch (error) {
            console.error('Rollback failed:', error);
            alert('Rollback failed');
        } finally {
            setRollingBack(false);
        }
    };

    const toggleHistory = () => {
        if (!showHistory && history.length === 0) {
            fetchHistory();
        }
        setShowHistory(!showHistory);
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset to default values?')) {
            fetchConfig();
        }
    };

    const updateConfig = (section, key, value) => {
        setConfig({
            ...config,
            [section]: {
                ...config[section],
                [key]: parseFloat(value)
            }
        });
    };

    const updateTopLevel = (key, value) => {
        setConfig({
            ...config,
            [key]: parseFloat(value)
        });
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Loading configuration...</p>
            </div>
        );
    }

    return (
        <div className="admin-scoring">
            <div className="admin-scoring__header">
                <div>
                    <h1 className="admin-title">Scoring Configuration</h1>
                    <p className="admin-subtitle">Adjust scoring parameters and thresholds</p>
                    {lastUpdated && (
                        <div className="last-updated">
                            <Clock size={14} />
                            <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
                            {updatedBy && <span className="updated-by"> by {updatedBy}</span>}
                        </div>
                    )}
                </div>
                <div className="header-actions">
                    <button className="btn btn--secondary" onClick={toggleHistory}>
                        <History size={18} />
                        History
                        {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button className="btn btn--secondary" onClick={handleReset}>
                        <RotateCcw size={18} />
                        Reset
                    </button>
                    <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button className="btn btn--secondary" onClick={() => navigate('/admin')}>
                        Back
                    </button>
                </div>
            </div>

            {/* History Panel */}
            {showHistory && (
                <Card className="history-panel">
                    <h3 className="history-panel__title">
                        <History size={18} />
                        Configuration History
                    </h3>
                    {historyLoading ? (
                        <div className="history-loading"><Spinner size="sm" /> Loading history...</div>
                    ) : history.length === 0 ? (
                        <p className="history-empty">No configuration changes recorded yet.</p>
                    ) : (
                        <div className="history-list">
                            {history.map(entry => (
                                <div key={entry.id} className="history-item">
                                    <div className="history-item__info">
                                        <div className="history-item__date">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </div>
                                        <div className="history-item__details">
                                            {entry.created_by && <span className="history-by">by {entry.created_by}</span>}
                                            {entry.reason && <span className="history-reason">{entry.reason}</span>}
                                        </div>
                                        <div className="history-item__snapshot">
                                            Weights: {entry.config_snapshot.accuracy_weight}/{entry.config_snapshot.fluency_weight}
                                            {' | '}
                                            Threshold: {entry.config_snapshot.weak_phoneme_threshold}
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn--secondary btn--sm"
                                        onClick={() => handleRollback(entry.id)}
                                        disabled={rollingBack}
                                    >
                                        <RotateCcw size={14} />
                                        Rollback
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            <div className="config-grid">
                <Card className="config-section">
                    <h3 className="config-section__title">Tier Thresholds</h3>
                    <p className="config-section__description">
                        Accuracy score thresholds for performance tiers
                    </p>
                    <div className="config-inputs">
                        {Object.entries(config.tier_thresholds || {}).map(([key, value]) => (
                            <div className="config-input" key={key}>
                                <label>{key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')} (≥)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={value}
                                    onChange={(e) => updateConfig('tier_thresholds', key, e.target.value)}
                                />
                                <span className="input-unit">({Math.round(value * 100)}%)</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="config-section">
                    <h3 className="config-section__title">PER Cutoffs</h3>
                    <p className="config-section__description">
                        Phoneme Error Rate thresholds for classification
                    </p>
                    <div className="config-inputs">
                        {Object.entries(config.per_cutoffs || {}).map(([key, value]) => (
                            <div className="config-input" key={key}>
                                <label>{key.charAt(0).toUpperCase() + key.slice(1)} (≤)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={value}
                                    onChange={(e) => updateConfig('per_cutoffs', key, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="config-section">
                    <h3 className="config-section__title">General Settings</h3>
                    <p className="config-section__description">
                        Other scoring parameters
                    </p>
                    <div className="config-inputs">
                        <div className="config-input">
                            <label>Weak Phoneme Threshold</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={config.weak_phoneme_threshold}
                                onChange={(e) => updateTopLevel('weak_phoneme_threshold', e.target.value)}
                            />
                            <span className="input-unit">({Math.round(config.weak_phoneme_threshold * 100)}%)</span>
                        </div>
                        <div className="config-input">
                            <label>Accuracy Weight</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={config.accuracy_weight}
                                onChange={(e) => updateTopLevel('accuracy_weight', e.target.value)}
                            />
                        </div>
                        <div className="config-input">
                            <label>Fluency Weight</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={config.fluency_weight}
                                onChange={(e) => updateTopLevel('fluency_weight', e.target.value)}
                            />
                        </div>
                    </div>
                </Card>
            </div>

            {showWarning && (
                <div className="modal-overlay" onClick={() => setShowWarning(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="warning-header">
                            <AlertTriangle size={48} />
                            <h2>Confirm Configuration Change</h2>
                        </div>
                        <p>
                            Changing scoring configuration will affect how future attempts are evaluated.
                            This may impact user scores and tier assignments.
                        </p>
                        <div className="form-group">
                            <label>Reason for change (optional)</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Adjusted thresholds based on user feedback"
                                className="reason-input"
                            />
                        </div>
                        <p className="warning-note">
                            A snapshot of the current configuration will be saved and can be rolled back.
                        </p>
                        <div className="warning-actions">
                            <button className="btn btn--secondary" onClick={() => setShowWarning(false)}>
                                Cancel
                            </button>
                            <button className="btn btn--warning" onClick={confirmSave}>
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminScoring;
