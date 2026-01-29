/**
 * Phoneme Mastery Section Component
 * Displays phoneme progress with grouping and filtering
 */

import { useState, useMemo } from 'react';
import { ChevronRight, Search, Filter } from 'lucide-react';
import './PhonemeMasterySection.css';

function PhonemeMasteryBar({ phoneme, symbol, score, attempts }) {
    const percentage = Math.round(score * 100);
    const level = score >= 0.85 ? 'mastered' : score >= 0.7 ? 'proficient' : score >= 0.5 ? 'developing' : 'needs-work';
    const levelLabel = score >= 0.85 ? 'Mastered' : score >= 0.7 ? 'Proficient' : score >= 0.5 ? 'Developing' : 'Needs Work';

    return (
        <div className="phoneme-mastery__item">
            <div className="phoneme-mastery__header">
                <div className="phoneme-mastery__phoneme">
                    <span className="phoneme-mastery__symbol">/{symbol || phoneme}/</span>
                    <span className="phoneme-mastery__arpabet">{phoneme}</span>
                </div>
                <span className={`phoneme-mastery__badge phoneme-mastery__badge--${level}`}>
                    {levelLabel}
                </span>
            </div>
            <div className="phoneme-mastery__bar-container">
                <div
                    className={`phoneme-mastery__bar phoneme-mastery__bar--${level}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="phoneme-mastery__meta">
                <span className="phoneme-mastery__score">{percentage}%</span>
                <span className="phoneme-mastery__attempts">{attempts} attempts</span>
            </div>
        </div>
    );
}

export function PhonemeMasterySection({ phonemeData, onViewAll }) {
    const [filterLevel, setFilterLevel] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [groupBy, setGroupBy] = useState('none'); // 'none', 'level', 'type'

    // Filter and group phonemes
    const filteredPhonemes = useMemo(() => {
        let filtered = [...phonemeData.all];

        // Apply level filter
        if (filterLevel !== 'all') {
            filtered = filtered.filter(p => {
                const score = p.current_score || 0;
                switch (filterLevel) {
                    case 'mastered': return score >= 0.85;
                    case 'proficient': return score >= 0.7 && score < 0.85;
                    case 'developing': return score >= 0.5 && score < 0.7;
                    case 'needs-work': return score < 0.5;
                    default: return true;
                }
            });
        }

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(p => 
                (p.phoneme || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.symbol || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [phonemeData.all, filterLevel, searchQuery]);

    const groupedPhonemes = useMemo(() => {
        if (groupBy === 'none') {
            return { 'All Phonemes': filteredPhonemes };
        }

        if (groupBy === 'level') {
            return {
                'Mastered': filteredPhonemes.filter(p => (p.current_score || 0) >= 0.85),
                'Proficient': filteredPhonemes.filter(p => (p.current_score || 0) >= 0.7 && (p.current_score || 0) < 0.85),
                'Developing': filteredPhonemes.filter(p => (p.current_score || 0) >= 0.5 && (p.current_score || 0) < 0.7),
                'Needs Work': filteredPhonemes.filter(p => (p.current_score || 0) < 0.5),
            };
        }

        return { 'All Phonemes': filteredPhonemes };
    }, [filteredPhonemes, groupBy]);

    const stats = useMemo(() => ({
        total: phonemeData.all.length,
        mastered: phonemeData.strong.length,
        needsWork: phonemeData.weak.length,
    }), [phonemeData]);

    return (
        <div className="phoneme-mastery">
            <div className="phoneme-mastery__header">
                <div>
                    <h2 className="phoneme-mastery__title">Phoneme Mastery</h2>
                    <p className="phoneme-mastery__subtitle">
                        {stats.needsWork} needs work, {stats.mastered} mastered
                    </p>
                </div>
            </div>

            <div className="phoneme-mastery__controls">
                <div className="phoneme-mastery__search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search phonemes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="phoneme-mastery__search-input"
                    />
                </div>

                <div className="phoneme-mastery__filters">
                    <button
                        className={`phoneme-mastery__filter-btn ${filterLevel === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('all')}
                    >
                        All
                    </button>
                    <button
                        className={`phoneme-mastery__filter-btn ${filterLevel === 'needs-work' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('needs-work')}
                    >
                        Needs Work
                    </button>
                    <button
                        className={`phoneme-mastery__filter-btn ${filterLevel === 'developing' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('developing')}
                    >
                        Developing
                    </button>
                    <button
                        className={`phoneme-mastery__filter-btn ${filterLevel === 'proficient' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('proficient')}
                    >
                        Proficient
                    </button>
                    <button
                        className={`phoneme-mastery__filter-btn ${filterLevel === 'mastered' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('mastered')}
                    >
                        Mastered
                    </button>
                </div>

                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="phoneme-mastery__group-select"
                >
                    <option value="none">No Grouping</option>
                    <option value="level">Group by Level</option>
                </select>
            </div>

            <div className="phoneme-mastery__list">
                {Object.entries(groupedPhonemes).map(([groupName, phonemes]) => (
                    phonemes.length > 0 && (
                        <div key={groupName} className="phoneme-mastery__group">
                            {groupBy !== 'none' && (
                                <h3 className="phoneme-mastery__group-title">{groupName}</h3>
                            )}
                            {phonemes.slice(0, 8).map((p, idx) => (
                                <PhonemeMasteryBar
                                    key={idx}
                                    phoneme={p.phoneme}
                                    symbol={p.symbol}
                                    score={p.current_score || 0}
                                    attempts={p.attempts || 0}
                                />
                            ))}
                        </div>
                    )
                ))}

                {filteredPhonemes.length === 0 && (
                    <p className="phoneme-mastery__no-data">No phonemes match your filters.</p>
                )}
            </div>

            {phonemeData.all.length > 8 && (
                <button
                    className="phoneme-mastery__view-all-btn"
                    onClick={onViewAll}
                >
                    View All Phonemes
                    <ChevronRight size={16} />
                </button>
            )}
        </div>
    );
}

export default PhonemeMasterySection;
