import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Search, Filter, Upload, Download, Sparkles, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Loader';
import apiClient from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './AdminSentences.css';

export function AdminSentences() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [sentences, setSentences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingSentence, setEditingSentence] = useState(null);
    const [formData, setFormData] = useState({
        text: '',
        difficulty_level: 'beginner',
        target_phonemes: [],
        is_validated: true,
        auto_detect_difficulty: false
    });
    const [phonemePreview, setPhonemePreview] = useState([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // AI Generation
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPhonemes, setAiPhonemes] = useState('');
    const [aiDifficulty, setAiDifficulty] = useState('intermediate');
    const [aiCount, setAiCount] = useState(3);
    const [aiGenerated, setAiGenerated] = useState([]);
    const [aiLoading, setAiLoading] = useState(false);

    // Bulk import
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    useEffect(() => {
        fetchSentences();
    }, [page, difficultyFilter]);

    const fetchSentences = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 50 });
            if (difficultyFilter !== 'all') params.append('difficulty', difficultyFilter);
            if (searchTerm) params.append('search', searchTerm);

            const response = await apiClient.get(`${ENDPOINTS.ADMIN.SENTENCES}?${params}`);
            setSentences(response.data.sentences || []);
            setTotalPages(response.data.pages || 1);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Failed to fetch sentences:', error);
            setSentences([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchSentences();
    };

    const handleAddNew = () => {
        setEditingSentence(null);
        setFormData({
            text: '',
            difficulty_level: 'beginner',
            target_phonemes: [],
            is_validated: true,
            auto_detect_difficulty: false
        });
        setPhonemePreview([]);
        setShowModal(true);
    };

    const handleEdit = (sentence) => {
        setEditingSentence(sentence);
        setFormData({
            text: sentence.text,
            difficulty_level: sentence.difficulty_level,
            target_phonemes: sentence.target_phonemes || [],
            is_validated: sentence.is_validated,
            auto_detect_difficulty: false
        });
        setPhonemePreview(sentence.phoneme_sequence || []);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSentence) {
                await apiClient.put(ENDPOINTS.ADMIN.SENTENCE_DETAIL(editingSentence.id), formData);
            } else {
                const response = await apiClient.post(ENDPOINTS.ADMIN.SENTENCES, formData);
                if (response.data.phoneme_sequence) {
                    setPhonemePreview(response.data.phoneme_sequence);
                }
            }
            setShowModal(false);
            fetchSentences();
        } catch (error) {
            console.error('Failed to save sentence:', error);
            alert(error.response?.data?.error || 'Failed to save sentence');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this sentence?')) return;

        try {
            await apiClient.delete(ENDPOINTS.ADMIN.SENTENCE_DETAIL(id));
            fetchSentences();
        } catch (error) {
            console.error('Failed to delete sentence:', error);
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await apiClient.patch(ENDPOINTS.ADMIN.SENTENCE_DETAIL(id), {
                is_validated: !currentStatus
            });
            fetchSentences();
        } catch (error) {
            console.error('Failed to toggle sentence status:', error);
        }
    };

    // AI Generation
    const handleAIGenerate = async () => {
        setAiLoading(true);
        setAiGenerated([]);
        try {
            const response = await apiClient.post(ENDPOINTS.ADMIN.SENTENCE_GENERATE, {
                target_phonemes: aiPhonemes.split(',').map(p => p.trim()).filter(Boolean),
                difficulty: aiDifficulty,
                count: aiCount
            });
            setAiGenerated(response.data.generated || []);
        } catch (error) {
            console.error('AI generation failed:', error);
            alert(error.response?.data?.error || 'AI sentence generation failed');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSaveAISentence = async (sentence) => {
        try {
            await apiClient.post(ENDPOINTS.ADMIN.SENTENCES, {
                text: sentence.text || sentence,
                difficulty_level: aiDifficulty,
                target_phonemes: aiPhonemes.split(',').map(p => p.trim()).filter(Boolean),
                is_validated: true
            });
            setAiGenerated(prev => prev.filter(s => s !== sentence));
            fetchSentences();
        } catch (error) {
            const errorMessage = error.data?.error || error.message || 'Failed to save sentence';
            console.error('Failed to save AI sentence:', errorMessage);
            // Don't alert if it's a duplicate (409) - just filter it out silently
            if (error.status === 409) {
                setAiGenerated(prev => prev.filter(s => s !== sentence));
            }
        }
    };

    // Bulk Import
    const handleBulkImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setImporting(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiClient.post(ENDPOINTS.ADMIN.SENTENCE_BULK_IMPORT, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImportResult(response.data);
            fetchSentences();
        } catch (error) {
            console.error('Bulk import failed:', error);
            setImportResult({ error: error.response?.data?.error || 'Import failed' });
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Export
    const handleExport = () => {
        window.open(ENDPOINTS.ADMIN.SENTENCE_EXPORT, '_blank');
    };

    const filteredSentences = sentences.filter(s => {
        return s.text.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading && sentences.length === 0) {
        return (
            <div className="admin-loading">
                <Spinner size="lg" />
                <p>Loading sentences...</p>
            </div>
        );
    }

    return (
        <div className="admin-sentences">
            <div className="admin-sentences__header">
                <div>
                    <h1 className="admin-title">Sentence Bank</h1>
                    <p className="admin-subtitle">
                        Manage practice sentences and phoneme targets
                        <span className="total-count"> ({total} total)</span>
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn btn--accent" onClick={() => setShowAIModal(true)}>
                        <Sparkles size={18} />
                        AI Generate
                    </button>
                    <button className="btn btn--secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={18} />
                        Import CSV
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleBulkImport}
                        style={{ display: 'none' }}
                    />
                    <button className="btn btn--secondary" onClick={handleExport}>
                        <Download size={18} />
                        Export
                    </button>
                    <button className="btn btn--primary" onClick={handleAddNew}>
                        <Plus size={18} />
                        Add Sentence
                    </button>
                    <button className="btn btn--secondary" onClick={() => navigate('/admin')}>
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {/* Import result banner */}
            {importResult && (
                <Card className={`import-result ${importResult.error ? 'import-result--error' : 'import-result--success'}`}>
                    {importResult.error ? (
                        <p>{importResult.error}</p>
                    ) : (
                        <p>
                            Imported {importResult.imported} sentences
                            {importResult.skipped > 0 && ` (${importResult.skipped} skipped)`}
                        </p>
                    )}
                    <button className="btn-close" onClick={() => setImportResult(null)}>Dismiss</button>
                </Card>
            )}

            <Card className="admin-sentences__controls">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search sentences..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="search-input"
                    />
                </div>
                <div className="filter-row">
                    <div className="filter-group">
                        <Filter size={16} />
                        <span className="filter-label">Difficulty:</span>
                        <select
                            value={difficultyFilter}
                            onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="all">All</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                </div>
            </Card>

            <div className="sentences-table">
                {filteredSentences.length === 0 ? (
                    <Card className="empty-state">
                        <p>No sentences found</p>
                    </Card>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Text</th>
                                    <th>Difficulty</th>
                                    <th>Target Phonemes</th>
                                    <th>Avg Accuracy</th>
                                    <th>Usage Count</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSentences.map(sentence => (
                                    <tr key={sentence.id} className={!sentence.is_validated ? 'row-disabled' : ''}>
                                        <td className="sentence-text">{sentence.text}</td>
                                        <td>
                                            <span className={`difficulty-badge difficulty-badge--${sentence.difficulty_level}`}>
                                                {sentence.difficulty_level}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="phonemes-list">
                                                {(sentence.target_phonemes || []).slice(0, 5).map((p, i) => (
                                                    <span key={i} className="phoneme-tag">{p}</span>
                                                ))}
                                                {(sentence.target_phonemes || []).length > 5 && (
                                                    <span className="phoneme-tag">+{(sentence.target_phonemes || []).length - 5}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{Math.round((sentence.avg_accuracy || 0) * 100)}%</td>
                                        <td>{sentence.usage_count || 0}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-icon btn-icon--primary"
                                                    onClick={() => handleEdit(sentence)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className={`btn-icon ${sentence.is_validated ? 'btn-icon--warning' : 'btn-icon--success'}`}
                                                    onClick={() => handleToggleActive(sentence.id, sentence.is_validated)}
                                                    title={sentence.is_validated ? 'Disable' : 'Enable'}
                                                >
                                                    {sentence.is_validated ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                                <button
                                                    className="btn-icon btn-icon--error"
                                                    onClick={() => handleDelete(sentence.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            {editingSentence ? 'Edit Sentence' : 'Add New Sentence'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Sentence Text</label>
                                <textarea
                                    value={formData.text}
                                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                    required
                                    rows={3}
                                    placeholder="Enter practice sentence..."
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Difficulty Level</label>
                                    <select
                                        value={formData.difficulty_level}
                                        onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                                <div className="form-group form-group--checkbox">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.auto_detect_difficulty}
                                            onChange={(e) => setFormData({ ...formData, auto_detect_difficulty: e.target.checked })}
                                        />
                                        Auto-detect difficulty
                                    </label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Target Phonemes (comma-separated, auto-generated if empty)</label>
                                <input
                                    type="text"
                                    value={(formData.target_phonemes || []).join(', ')}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        target_phonemes: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                                    })}
                                    placeholder="Leave empty for auto-generation (e.g., TH, S, R)"
                                />
                            </div>
                            {phonemePreview.length > 0 && (
                                <div className="phoneme-preview">
                                    <label>Phoneme Sequence Preview:</label>
                                    <div className="phonemes-list">
                                        {phonemePreview.map((p, i) => (
                                            <span key={i} className="phoneme-tag phoneme-tag--preview">{p}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="form-actions">
                                <button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn--primary">
                                    {editingSentence ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Generation Modal */}
            {showAIModal && (
                <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
                    <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            <Wand2 size={24} />
                            AI Sentence Generator
                        </h2>
                        <div className="ai-controls">
                            <div className="form-group">
                                <label>Target Phonemes (comma-separated)</label>
                                <input
                                    type="text"
                                    value={aiPhonemes}
                                    onChange={(e) => setAiPhonemes(e.target.value)}
                                    placeholder="e.g., TH, R, S"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Difficulty</label>
                                    <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Count (max 10)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={aiCount}
                                        onChange={(e) => setAiCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                    />
                                </div>
                            </div>
                            <button
                                className="btn btn--accent"
                                onClick={handleAIGenerate}
                                disabled={aiLoading}
                            >
                                <Sparkles size={18} />
                                {aiLoading ? 'Generating...' : 'Generate Sentences'}
                            </button>
                        </div>

                        {aiGenerated.length > 0 && (
                            <div className="ai-results">
                                <h3>Generated Sentences</h3>
                                <p className="ai-results__hint">Click "Save" to add a sentence to the bank.</p>
                                {aiGenerated.map((sentence, idx) => {
                                    const text = typeof sentence === 'string' ? sentence : sentence.text;
                                    return (
                                        <div key={idx} className="ai-result-item">
                                            <span className="ai-result-text">{text}</span>
                                            <button
                                                className="btn btn--primary btn--sm"
                                                onClick={() => handleSaveAISentence(sentence)}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="form-actions">
                            <button className="btn btn--secondary" onClick={() => setShowAIModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminSentences;
