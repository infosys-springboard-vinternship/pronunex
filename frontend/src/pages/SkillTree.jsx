/**
 * Skill Tree / Learning Path Page
 * Duolingo-style progression with units and crown levels
 */

import { useState, useEffect } from 'react';
import { Lock, Star, Trophy, ChevronRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { Spinner } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import './SkillTree.css';

export default function SkillTree() {
    const { user } = useAuth();
    const [learningPaths, setLearningPaths] = useState([]);
    const [selectedPath, setSelectedPath] = useState(null);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLearningPaths();
    }, []);

    useEffect(() => {
        if (selectedPath) {
            fetchUnits(selectedPath.id);
        }
    }, [selectedPath]);

    const fetchLearningPaths = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(ENDPOINTS.LEARNING_PATHS.LIST);
            setLearningPaths(data);
            if (data.length > 0) {
                setSelectedPath(data[0]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnits = async (pathId) => {
        try {
            const { data } = await api.get(ENDPOINTS.LEARNING_PATHS.UNITS(pathId));
            setUnits(data);
        } catch (err) {
            console.error('Failed to fetch units:', err);
        }
    };

    if (loading) {
        return (
            <div className="skill-tree__loading">
                <Spinner size="large" />
            </div>
        );
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchLearningPaths} />;
    }

    return (
        <div className="skill-tree">
            <div className="skill-tree__header">
                <h1 className="skill-tree__title">Learning Path</h1>
                <p className="skill-tree__subtitle">
                    Master pronunciation through progressive skill levels
                </p>
            </div>

            <div className="skill-tree__paths">
                {learningPaths.map((path) => (
                    <PathCard
                        key={path.id}
                        path={path}
                        isSelected={selectedPath?.id === path.id}
                        onClick={() => setSelectedPath(path)}
                    />
                ))}
            </div>

            {selectedPath && (
                <div className="skill-tree__content">
                    <div className="skill-tree__path-info">
                        <h2>{selectedPath.name}</h2>
                        <p>{selectedPath.description}</p>
                    </div>

                    <div className="skill-tree__units">
                        {units.map((unit, index) => (
                            <UnitCard key={unit.id} unit={unit} index={index} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function PathCard({ path, isSelected, onClick }) {
    const difficultyColors = {
        beginner: '#10b981',
        intermediate: '#f59e0b',
        advanced: '#ef4444',
    };

    const color = difficultyColors[path.difficulty] || '#6b7280';

    return (
        <button
            className={`path-card ${isSelected ? 'path-card--selected' : ''}`}
            onClick={onClick}
            style={{ borderColor: isSelected ? color : 'transparent' }}
        >
            <div className="path-card__icon" style={{ backgroundColor: color + '20', color }}>
                {path.difficulty === 'beginner' && <Star size={24} />}
                {path.difficulty === 'intermediate' && <Trophy size={24} />}
                {path.difficulty === 'advanced' && <Trophy size={24} fill="currentColor" />}
            </div>
            <div className="path-card__content">
                <h3 className="path-card__name">{path.name}</h3>
                <span className="path-card__difficulty">{path.get_difficulty_display || path.difficulty}</span>
            </div>
            {isSelected && <CheckCircle className="path-card__check" size={20} />}
        </button>
    );
}

function UnitCard({ unit, index }) {
    const [expanded, setExpanded] = useState(false);
    const isLocked = unit.is_locked || false;
    const phonemeCount = unit.phonemes?.length || 0;
    const completedPhonemes = unit.phonemes?.filter(p => p.crown_level >= 5).length || 0;
    const progress = phonemeCount > 0 ? (completedPhonemes / phonemeCount) * 100 : 0;

    return (
        <div className={`unit-card ${isLocked ? 'unit-card--locked' : ''}`}>
            <button
                className="unit-card__header"
                onClick={() => !isLocked && setExpanded(!expanded)}
                disabled={isLocked}
            >
                <div className="unit-card__number">{index + 1}</div>

                <div className="unit-card__info">
                    <h3 className="unit-card__name">
                        {isLocked && <Lock size={16} className="unit-card__lock" />}
                        {unit.name}
                    </h3>
                    <p className="unit-card__description">{unit.description}</p>

                    {!isLocked && (
                        <div className="unit-card__progress">
                            <div className="unit-card__progress-bar">
                                <div
                                    className="unit-card__progress-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="unit-card__progress-text">
                                {completedPhonemes}/{phonemeCount} mastered
                            </span>
                        </div>
                    )}
                </div>

                {!isLocked && (
                    <ChevronRight
                        className={`unit-card__chevron ${expanded ? 'unit-card__chevron--expanded' : ''}`}
                        size={20}
                    />
                )}
            </button>

            {expanded && !isLocked && (
                <div className="unit-card__phonemes">
                    {unit.phonemes?.map((phoneme) => (
                        <PhonemeItem key={phoneme.id} phoneme={phoneme} />
                    ))}
                </div>
            )}
        </div>
    );
}

function PhonemeItem({ phoneme }) {
    const crownLevel = phoneme.crown_level || 0;
    const isLocked = crownLevel === 0;
    const isLegendary = phoneme.is_legendary || false;

    return (
        <div className={`phoneme-item ${isLocked ? 'phoneme-item--locked' : ''}`}>
            <div className="phoneme-item__symbol">
                {phoneme.symbol || phoneme.arpabet}
            </div>

            <div className="phoneme-item__info">
                <span className="phoneme-item__arpabet">{phoneme.arpabet}</span>
                <span className="phoneme-item__example">{phoneme.example_word}</span>
            </div>

            <div className="phoneme-item__crowns">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                        key={i}
                        size={16}
                        className={`phoneme-item__crown ${i < crownLevel ? 'phoneme-item__crown--earned' : ''}`}
                        fill={i < crownLevel ? 'currentColor' : 'none'}
                    />
                ))}
                {isLegendary && (
                    <Trophy
                        size={16}
                        className="phoneme-item__legendary"
                        fill="currentColor"
                    />
                )}
            </div>
        </div>
    );
}
