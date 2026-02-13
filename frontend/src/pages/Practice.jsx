/**
 * Practice Page - Enterprise Bento Grid Layout
 * Premium EdTech design with difficulty tiering, waveform visualization, 
 * metric cards, and adaptive recommendations
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    Mic,
    Square,
    Play,
    Pause,
    RotateCcw,
    Send,
    Volume2,
    Target,
    Gauge,
    BarChart3,
    Check,
    X
} from 'lucide-react';
import { useApi, useMutation } from '../hooks/useApi';
import { useUI } from '../context/UIContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { Spinner } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { DifficultyBadge, MetricCard, RecommendationCard, ConfidenceMeter, LevelSelector, SublevelSelector, SublevelSummary, SessionProgressIndicator } from '../components/practice';
import { InsightsPanel } from '../components/practice/insights/InsightsPanel';
import { ComparisonVisualizer } from '../components/practice/insights/ComparisonVisualizer';
import { AIRecommendations } from '../components/practice/insights/AIRecommendations';
import { MistakePanel, ContentMismatchError, UnscorableError } from '../components/practice/MistakePanel';
import { LetterHighlight } from '../components/practice/LetterHighlight';
import './Practice.css';

// Waveform Visualizer Component
function WaveformVisualizer({ isRecording, audioStream }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const analyserRef = useRef(null);

    useEffect(() => {
        if (!isRecording || !audioStream) {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!isRecording) return;

            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;

            ctx.fillStyle = 'rgb(248, 250, 252)';
            ctx.fillRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * height * 0.8;

                const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                gradient.addColorStop(0, '#14b8a6');
                gradient.addColorStop(1, '#0d9488');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

                x += barWidth;
            }
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            audioContext.close();
        };
    }, [isRecording, audioStream]);

    return (
        <div className="practice__waveform-container">
            <canvas
                ref={canvasRef}
                className="practice__waveform-canvas"
                width={600}
                height={120}
            />
        </div>
    );
}

// Word Heatmap Component - With accessibility icons
function WordHeatmap({ sentence, phonemeScores }) {
    const words = sentence.split(/\s+/);

    // Simple scoring: distribute phoneme scores across words
    const getWordScore = (wordIndex) => {
        if (!phonemeScores || phonemeScores.length === 0) return 0.8;

        const avgScore = phonemeScores.reduce((sum, ps) => sum + (ps.score || 0), 0) / phonemeScores.length;
        // Add some variance per word for visual interest
        const variance = (wordIndex % 3 === 0) ? -0.1 : (wordIndex % 3 === 1) ? 0.05 : 0;
        return Math.max(0, Math.min(1, avgScore + variance));
    };

    const getWordData = (score) => {
        if (score >= 0.8) return { class: 'practice__heatmap-word--correct', icon: Check, label: 'Correct' };
        if (score >= 0.6) return { class: 'practice__heatmap-word--needs-work', icon: AlertCircle, label: 'Close' };
        return { class: 'practice__heatmap-word--incorrect', icon: X, label: 'Needs work' };
    };

    return (
        <div className="practice__word-heatmap">
            {words.map((word, idx) => {
                const score = getWordScore(idx);
                const wordData = getWordData(score);
                const IconComponent = wordData.icon;
                return (
                    <span
                        key={idx}
                        className={`practice__heatmap-word ${wordData.class}`}
                        title={`${wordData.label}: ${Math.round(score * 100)}%`}
                    >
                        <IconComponent size={14} className="practice__heatmap-icon" />
                        {word}
                    </span>
                );
            })}
        </div>
    );
}

// Score Ring Component
function ScoreRing({ score }) {
    const circumference = 2 * Math.PI * 42;
    const strokeDasharray = `${(score * circumference)} ${circumference}`;
    const isGood = score >= 0.7;

    return (
        <div className="practice__score-ring">
            <svg viewBox="0 0 100 100">
                <circle
                    className="practice__score-ring-bg"
                    cx="50"
                    cy="50"
                    r="42"
                />
                <circle
                    className={`practice__score-ring-progress ${isGood ? 'practice__score-ring-progress--good' : 'practice__score-ring-progress--needs-work'}`}
                    cx="50"
                    cy="50"
                    r="42"
                    strokeDasharray={strokeDasharray}
                />
            </svg>
            <span className="practice__score-value">{Math.round(score * 100)}%</span>
        </div>
    );
}

export function Practice() {
    const navigate = useNavigate();
    const { toast } = useUI();
    const { settings } = useSettings();

    // Level selection — null means show level selector screen
    const [selectedLevel, setSelectedLevel] = useState(() => {
        const cached = sessionStorage.getItem('practice_selectedLevel');
        return cached || null;
    });

    // Sublevel selection — null means show sublevel selector screen
    const [selectedSublevel, setSelectedSublevel] = useState(() => {
        const cached = sessionStorage.getItem('practice_selectedSublevel');
        return cached || null;
    });

    // Sublevel summary state
    const [showSublevelSummary, setShowSublevelSummary] = useState(false);

    // Session storage keys for state persistence
    const STORAGE_KEYS = {
        currentIndex: 'practice_currentIndex',
        sessionId: 'practice_sessionId',
        assessment: 'practice_assessment',
        sentenceIds: 'practice_sentenceIds',  // Cache sentence order
        assessmentResults: 'practice_assessmentResults',  // Cache all assessments by sentence ID
        settingsHash: 'practice_settingsHash',  // Track if settings changed
        sublevelSummaryShown: 'practice_sublevelSummaryShown',  // Track if summary was shown
    };

    // Load persisted state from sessionStorage
    const getPersistedState = (key, defaultValue) => {
        try {
            const stored = sessionStorage.getItem(key);
            if (stored !== null) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn(`Failed to load ${key} from storage:`, e);
        }
        return defaultValue;
    };

    // Create a hash of current settings to detect changes
    const activeDifficulty = selectedLevel || settings.defaultDifficulty;
    const settingsHash = `${activeDifficulty}_${selectedSublevel || ''}_${settings.dailyGoal}`;
    const cachedSettingsHash = sessionStorage.getItem(STORAGE_KEYS.settingsHash);
    const cachedSentenceIds = getPersistedState(STORAGE_KEYS.sentenceIds, null);

    // Check if we should use cached sentences or fetch fresh ones
    const shouldUseCachedSentences = cachedSettingsHash === settingsHash && cachedSentenceIds && cachedSentenceIds.length > 0;

    // Build recommend URL with user preferences (including sublevel)
    const recommendUrl = `${ENDPOINTS.SENTENCES.RECOMMEND}?difficulty=${activeDifficulty}&sublevel=${selectedSublevel || '1'}&limit=5`;
    const { data: sentencesData, isLoading, error, refetch } = useApi(recommendUrl, {
        enabled: !!selectedLevel && !!selectedSublevel && !shouldUseCachedSentences  // Only fetch once level AND sublevel are chosen
    });

    // Use cached sentences if available, otherwise use freshly fetched ones
    const [sentences, setSentences] = useState(() => {
        if (shouldUseCachedSentences) {
            // Will be populated from cache in useEffect
            return [];
        }
        return sentencesData?.recommendations || (Array.isArray(sentencesData) ? sentencesData : []);
    });

    const { mutate, isLoading: isAssessing } = useMutation();


    // Initialize state with persisted values
    const [currentIndex, setCurrentIndex] = useState(() =>
        getPersistedState(STORAGE_KEYS.currentIndex, 0)
    );
    const [assessment, setAssessment] = useState(() =>
        getPersistedState(STORAGE_KEYS.assessment, null)
    );
    const [sessionId, setSessionId] = useState(() =>
        getPersistedState(STORAGE_KEYS.sessionId, null)
    );

    // Recording state (not persisted - audio blobs can't be stored)
    const [isRecording, setIsRecording] = useState(false);
    const [hasRecording, setHasRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [duration, setDuration] = useState(0);
    const [audioStream, setAudioStream] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [assessmentError, setAssessmentError] = useState(null); // For content_mismatch/unscorable errors

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const referenceAudioRef = useRef(null);

    const [isLoadingReference, setIsLoadingReference] = useState(false);
    const [isPlayingReference, setIsPlayingReference] = useState(false);
    const [cachedAudioUrl, setCachedAudioUrl] = useState(null);

    // Shadowing Mode - 0.8x speed for simultaneous speaking
    const [isShadowingMode, setIsShadowingMode] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    const maxDuration = 30;
    const currentSentence = sentences?.[currentIndex];

    // Track settings changes and reset session when difficulty, sublevel, or daily goal changes
    const prevSettingsRef = useRef({ defaultDifficulty: activeDifficulty, sublevel: selectedSublevel, dailyGoal: settings.dailyGoal });
    useEffect(() => {
        const prevSettings = prevSettingsRef.current;
        if (prevSettings.defaultDifficulty !== activeDifficulty ||
            prevSettings.sublevel !== selectedSublevel ||
            prevSettings.dailyGoal !== settings.dailyGoal) {
            // Settings changed - clear cached session data and reset
            Object.values(STORAGE_KEYS).forEach(key => {
                if (key !== 'practice_selectedLevel' && key !== 'practice_selectedSublevel') {
                    sessionStorage.removeItem(key);
                }
            });
            setCurrentIndex(0);
            setAssessment(null);
            setSessionId(null);
            prevSettingsRef.current = { defaultDifficulty: activeDifficulty, sublevel: selectedSublevel, dailyGoal: settings.dailyGoal };
        }
    }, [activeDifficulty, selectedSublevel, settings.dailyGoal]);

    // Persist selectedLevel to sessionStorage
    useEffect(() => {
        if (selectedLevel) {
            sessionStorage.setItem('practice_selectedLevel', selectedLevel);
        } else {
            sessionStorage.removeItem('practice_selectedLevel');
        }
    }, [selectedLevel]);

    // Persist selectedSublevel to sessionStorage
    useEffect(() => {
        if (selectedSublevel) {
            sessionStorage.setItem('practice_selectedSublevel', selectedSublevel);
        } else {
            sessionStorage.removeItem('practice_selectedSublevel');
        }
    }, [selectedSublevel]);

    // Compute completed count and average score from cached assessments
    const assessmentResults = getPersistedState(STORAGE_KEYS.assessmentResults, {});
    const completedCount = sentences.length > 0
        ? sentences.filter(s => assessmentResults[s.id]).length
        : 0;
    const averageScore = completedCount > 0
        ? sentences.reduce((sum, s) => {
            const r = assessmentResults[s.id];
            return sum + (r ? (r.overall_score || 0) : 0);
        }, 0) / completedCount
        : 0;

    // Persist state changes to sessionStorage
    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEYS.currentIndex, JSON.stringify(currentIndex));
    }, [currentIndex]);

    useEffect(() => {
        if (sessionId !== null) {
            sessionStorage.setItem(STORAGE_KEYS.sessionId, JSON.stringify(sessionId));
        }
    }, [sessionId]);

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEYS.assessment, JSON.stringify(assessment));
    }, [assessment]);

    // Validate currentIndex against loaded sentences
    useEffect(() => {
        if (sentences?.length > 0 && currentIndex >= sentences.length) {
            setCurrentIndex(0);
        }
    }, [sentences, currentIndex]);

    // Cache sentences when freshly fetched from API
    useEffect(() => {
        if (sentencesData && !shouldUseCachedSentences) {
            const newSentences = sentencesData?.recommendations || (Array.isArray(sentencesData) ? sentencesData : []);
            if (newSentences.length > 0) {
                // Update sentences state
                setSentences(newSentences);

                // Cache sentence IDs for future loads
                const sentenceIds = newSentences.map(s => s.id);
                sessionStorage.setItem(STORAGE_KEYS.sentenceIds, JSON.stringify(sentenceIds));

                // Save current settings hash
                sessionStorage.setItem(STORAGE_KEYS.settingsHash, settingsHash);
            }
        }
    }, [sentencesData, shouldUseCachedSentences, settingsHash]);

    // Load sentences from cache if available
    useEffect(() => {
        const loadCachedSentences = async () => {
            if (shouldUseCachedSentences && sentences.length === 0 && cachedSentenceIds) {
                try {
                    // Fetch sentences by their IDs in the cached order
                    const token = sessionStorage.getItem('access_token');
                    const cachedSentencesPromises = cachedSentenceIds.map(id =>
                        fetch(`${ENDPOINTS.SENTENCES.DETAIL(id)}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }).then(res => res.json())
                    );

                    const cachedSentencesData = await Promise.all(cachedSentencesPromises);
                    setSentences(cachedSentencesData);
                } catch (err) {
                    console.error('Failed to load cached sentences:', err);
                    // If cache loading fails, trigger a refetch
                    sessionStorage.removeItem(STORAGE_KEYS.sentenceIds);
                    sessionStorage.removeItem(STORAGE_KEYS.settingsHash);
                    refetch();
                }
            }
        };

        loadCachedSentences();
    }, [shouldUseCachedSentences, sentences.length, cachedSentenceIds]);

    // Load assessment result for current sentence from cache when navigating
    useEffect(() => {
        if (currentSentence) {
            const assessmentResults = getPersistedState(STORAGE_KEYS.assessmentResults, {});
            const cachedAssessment = assessmentResults[currentSentence.id];

            if (cachedAssessment) {
                // Load previously saved assessment
                setAssessment(cachedAssessment);
            } else {
                // No cached assessment for this sentence
                setAssessment(null);
            }
        }
    }, [currentSentence?.id]);


    // Create session on mount (only if no persisted session)
    useEffect(() => {
        const createSession = async () => {
            // Skip if we already have a session from storage
            if (sessionId) return;

            try {
                const { data } = await api.post(ENDPOINTS.SESSIONS.CREATE, {});
                setSessionId(data.id);
            } catch (err) {
                console.error('Failed to create session:', err);
            }
        };
        createSession();
    }, [sessionId]);

    // Pre-generate TTS audio for sentences when loaded
    useEffect(() => {
        if (sentences?.length > 0) {
            // Pre-generate audio for first 3 sentences in background
            const sentenceIds = sentences.slice(0, 3).map(s => s.id);
            api.post(ENDPOINTS.SENTENCES.PREGENERATE, { sentence_ids: sentenceIds })
                .catch(err => console.log('TTS pre-generation queued:', err));
        }
    }, [sentences]);

    // Pre-fetch audio for current sentence (instant playback)
    useEffect(() => {
        if (!currentSentence) return;

        // Clear previous cached audio
        if (cachedAudioUrl) {
            URL.revokeObjectURL(cachedAudioUrl);
            setCachedAudioUrl(null);
        }

        // Pre-fetch audio in background
        const prefetchAudio = async () => {
            try {
                const audioUrl = ENDPOINTS.SENTENCES.AUDIO(currentSentence.id);
                const token = sessionStorage.getItem('access_token');

                const response = await fetch(audioUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    setCachedAudioUrl(objectUrl);
                }
            } catch (err) {
                // Silent fail - will fetch on click if not cached
            }
        };

        prefetchAudio();

        return () => {
            // Cleanup on unmount
            if (cachedAudioUrl) {
                URL.revokeObjectURL(cachedAudioUrl);
            }
        };
    }, [currentSentence?.id]);

    // Format duration as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Start recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setHasRecording(true);
                stream.getTracks().forEach(track => track.stop());
                setAudioStream(null);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= maxDuration - 1) {
                        stopRecording();
                        return maxDuration;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            toast.error('Could not access microphone. Please check permissions.');
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    // Cancel/retry recording
    const cancelRecording = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioBlob(null);
        setAudioUrl(null);
        setHasRecording(false);
        setDuration(0);
    };

    // Toggle playback
    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Submit recording
    const handleSubmit = async () => {
        if (!currentSentence || !audioBlob) return;

        // Clear previous errors
        setAssessmentError(null);

        try {
            const result = await mutate(async () => {
                return api.uploadAudio(currentSentence.id, audioBlob);
            });

            const data = result.data;

            // Check for error responses from the new NLP pipeline
            if (data.error === 'content_mismatch') {
                // User said something completely different
                setAssessmentError({
                    type: 'content_mismatch',
                    message: data.message,
                    transcribed: data.transcribed,
                    expected: data.expected || currentSentence.text,
                    similarity: data.similarity,
                    suggestion: data.suggestion
                });
                toast.error('Speech content mismatch detected');
                return;
            }

            if (data.error === 'unscorable') {
                // Technical issue with audio processing
                setAssessmentError({
                    type: 'unscorable',
                    message: data.message,
                    reason: data.reason,
                    suggestion: data.suggestion
                });
                toast.error('Could not analyze audio');
                return;
            }

            // Success - set assessment data
            setAssessment(data);
            toast.success('Assessment complete!');

            // Cache this assessment result for this sentence
            const assessmentResults = getPersistedState(STORAGE_KEYS.assessmentResults, {});
            assessmentResults[currentSentence.id] = data;
            sessionStorage.setItem(STORAGE_KEYS.assessmentResults, JSON.stringify(assessmentResults));

            // Auto-advance to next sentence if enabled and score is good
            if (settings.autoAdvance && data.overall_score >= 0.7 && currentIndex < (sentences?.length || 0) - 1) {
                setTimeout(() => {
                    setCurrentIndex(prev => prev + 1);
                    setAssessmentError(null);
                    cancelRecording();
                    toast.info('Auto-advancing to next sentence...');
                }, 2000); // 2 second delay to show results
            }
        } catch (err) {
            // Network or server error
            toast.error('Failed to assess pronunciation. Please try again.');
        }
    };

    // Navigation handlers
    const handleNext = async () => {
        if (currentIndex < (sentences?.length || 0) - 1) {
            setCurrentIndex(prev => prev + 1);
            // Assessment will be auto-loaded from cache via useEffect
            setAssessmentError(null);
            cancelRecording();
        } else {
            // Last sentence completed - show sublevel summary
            const results = getPersistedState(STORAGE_KEYS.assessmentResults, {});
            const completedSentences = sentences.filter(s => results[s.id]);
            
            if (completedSentences.length === 5) {
                // Calculate average score
                const totalScore = completedSentences.reduce((sum, s) => {
                    const result = results[s.id];
                    return sum + (result.overall_score || 0);
                }, 0);
                const avgScore = totalScore / completedSentences.length;

                // Save sublevel completion to backend
                try {
                    await api.post(ENDPOINTS.PRACTICE.SUBLEVEL_COMPLETE, {
                        level: selectedLevel,
                        sublevel: selectedSublevel,
                        average_score: avgScore,
                        attempts: 5
                    });
                } catch (err) {
                    console.error('Failed to save sublevel completion:', err);
                }

                // Show summary
                setShowSublevelSummary(true);
            }
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            // Assessment will be auto-loaded from cache via useEffect
            setAssessmentError(null);
            cancelRecording();
        }
    };

    const handleTryAgain = () => {
        // Clear current sentence's cached assessment
        if (currentSentence) {
            const assessmentResults = getPersistedState(STORAGE_KEYS.assessmentResults, {});
            delete assessmentResults[currentSentence.id];
            sessionStorage.setItem(STORAGE_KEYS.assessmentResults, JSON.stringify(assessmentResults));
        }

        setAssessment(null);
        setAssessmentError(null);
        cancelRecording();
    };

    // Reset entire session and start fresh — returns to level selector
    const handleStartFresh = async () => {
        // Clear persisted state
        Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
        sessionStorage.removeItem('practice_selectedLevel');

        // Reset all state
        setSelectedLevel(null);
        setCurrentIndex(0);
        setAssessment(null);
        setAssessmentError(null);
        cancelRecording();

        // Session will be created when level is selected again
        toast.success('Session reset! Choose a new level.');
    };

    // Change level handler — goes back to level selector
    const handleChangeLevel = () => {
        Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
        sessionStorage.removeItem('practice_selectedLevel');
        sessionStorage.removeItem('practice_selectedSublevel');
        setSelectedLevel(null);
        setSelectedSublevel(null);
        setCurrentIndex(0);
        setAssessment(null);
        setAssessmentError(null);
        cancelRecording();
        setSentences([]);
    };

    // Handle level selection from the LevelSelector component
    const handleLevelSelected = async (level) => {
        setSelectedLevel(level);
        setSelectedSublevel(null);  // Reset sublevel when changing level
        resetPracticeState();
    };

    // Handle sublevel selection from the SublevelSelector component
    const handleSublevelSelected = async (sublevel) => {
        setSelectedSublevel(sublevel);
        resetPracticeState();
        setShowSublevelSummary(false);
        // Create a new session
        try {
            const { data } = await api.post(ENDPOINTS.SESSIONS.CREATE, {});
            setSessionId(data.id);
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    };

    // Handle retry sublevel from summary
    const handleRetrySublevel = () => {
        setShowSublevelSummary(false);
        resetPracticeState();
        // Clear cached results
        sessionStorage.removeItem(STORAGE_KEYS.assessmentResults);
        sessionStorage.removeItem(STORAGE_KEYS.sentenceIds);
        sessionStorage.removeItem(STORAGE_KEYS.settingsHash);
        // Refetch sentences
        refetch();
    };

    // Handle next sublevel from summary
    const handleNextSublevel = () => {
        setShowSublevelSummary(false);
        const nextSublevel = selectedSublevel === '1' ? '2' : '1';
        setSelectedSublevel(nextSublevel);
        resetPracticeState();
        // Clear cached results
        sessionStorage.removeItem(STORAGE_KEYS.assessmentResults);
        sessionStorage.removeItem(STORAGE_KEYS.sentenceIds);
        sessionStorage.removeItem(STORAGE_KEYS.settingsHash);
    };

    // Play reference audio (TTS) - uses cached audio for instant playback
    const playReferenceAudio = async () => {
        if (!currentSentence) return;

        // If already playing, stop
        if (isPlayingReference && referenceAudioRef.current) {
            referenceAudioRef.current.pause();
            referenceAudioRef.current.currentTime = 0;
            setIsPlayingReference(false);
            return;
        }

        // Use cached audio if available (instant playback)
        if (cachedAudioUrl) {
            const audio = new Audio(cachedAudioUrl);
            referenceAudioRef.current = audio;

            // Apply shadowing mode speed (0.8x for simultaneous speaking)
            audio.playbackRate = isShadowingMode ? 0.8 : playbackSpeed;

            audio.onended = () => setIsPlayingReference(false);
            audio.onerror = () => {
                toast.error('Failed to play audio');
                setIsPlayingReference(false);
            };

            await audio.play();
            setIsPlayingReference(true);
            return;
        }

        // Fallback: fetch if not cached
        setIsLoadingReference(true);

        try {
            const audioUrl = ENDPOINTS.SENTENCES.AUDIO(currentSentence.id);
            const token = sessionStorage.getItem('access_token');

            const response = await fetch(audioUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load audio');
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            setCachedAudioUrl(objectUrl);  // Cache for future use

            const audio = new Audio(objectUrl);
            referenceAudioRef.current = audio;

            audio.onended = () => setIsPlayingReference(false);
            audio.onerror = () => {
                toast.error('Failed to play reference audio');
                setIsPlayingReference(false);
            };

            await audio.play();
            setIsPlayingReference(true);

        } catch (err) {
            console.error('Reference audio error:', err);
            toast.error('Could not load reference audio. TTS may be generating...');
        } finally {
            setIsLoadingReference(false);
        }
    };

    // Audio ended handler
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => setIsPlaying(false);
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [audioUrl]);

    // Level selector screen — shown before practice begins
    if (!selectedLevel) {
        return (
            <div className="practice">
                <LevelSelector
                    defaultLevel={settings.defaultDifficulty}
                    onSelectLevel={handleLevelSelected}
                />
            </div>
        );
    }

    // Sublevel selector screen — shown after level selected but before practice
    if (selectedLevel && !selectedSublevel) {
        return (
            <div className="practice">
                <SublevelSelector
                    level={selectedLevel}
                    onSelectSublevel={handleSublevelSelected}
                    onBack={() => setSelectedLevel(null)}
                />
            </div>
        );
    }

    // Sublevel summary screen — shown after completing all 5 sentences
    if (showSublevelSummary) {
        const results = getPersistedState(STORAGE_KEYS.assessmentResults, {});
        const completedSentences = sentences.filter(s => results[s.id]);
        
        // Calculate stats
        const totalScore = completedSentences.reduce((sum, s) => {
            return sum + (results[s.id]?.overall_score || 0);
        }, 0);
        const avgScore = totalScore / Math.max(completedSentences.length, 1);

        // Collect all weak phonemes
        const allWeakPhonemes = [];
        completedSentences.forEach(s => {
            const result = results[s.id];
            if (result?.weak_phonemes) {
                allWeakPhonemes.push(...result.weak_phonemes);
            }
        });
        
        // Find most common weak phoneme (focus area)
        const phonemeCounts = {};
        allWeakPhonemes.forEach(p => {
            phonemeCounts[p] = (phonemeCounts[p] || 0) + 1;
        });
        const uniqueWeakPhonemes = Object.keys(phonemeCounts).sort((a, b) => phonemeCounts[b] - phonemeCounts[a]);

        return (
            <SublevelSummary
                level={selectedLevel}
                sublevel={selectedSublevel}
                averageScore={avgScore}
                weakPhonemes={uniqueWeakPhonemes}
                totalAttempts={completedSentences.length}
                onRetry={handleRetrySublevel}
                onNext={handleNextSublevel}
            />
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="practice-loading">
                <Spinner size="lg" />
                <p>Loading practice sentences...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="practice-error">
                <ErrorState
                    icon="server"
                    title="Failed to load sentences"
                    message="We could not load practice sentences. Please try again."
                    onRetry={refetch}
                />
            </div>
        );
    }

    // Empty state
    if (!sentences || sentences.length === 0) {
        return (
            <div className="practice-empty">
                <EmptyState
                    icon="file"
                    title="No Practice Sentences"
                    message="No practice sentences are available at the moment."
                    action={{
                        label: 'Go to Dashboard',
                        onClick: () => navigate('/'),
                    }}
                />
            </div>
        );
    }

    return (
        <div className="practice">
            {/* Progress Header with Level Indicator */}
            <header className="practice__progress-header">
                <div className="practice__progress-info">
                    <h1 className="practice__title">Practice Session</h1>
                    <span className="practice__progress-text">
                        {currentIndex + 1} of {sentences.length}
                    </span>
                    {currentIndex > 0 && (
                        <button
                            type="button"
                            className="practice__start-fresh-btn"
                            onClick={handleStartFresh}
                            title="Start fresh session"
                        >
                            <RotateCcw size={14} />
                            <span>Start Fresh</span>
                        </button>
                    )}
                </div>
                <SessionProgressIndicator
                    currentIndex={currentIndex}
                    totalSentences={sentences.length}
                    completedCount={completedCount}
                    averageScore={averageScore}
                    currentLevel={activeDifficulty}
                    onChangeLevel={handleChangeLevel}
                />
            </header>

            {/* Main Two-Column Layout */}
            <main className="practice__main">
                {/* Left Column - The Content */}
                <section className="practice__content-column">
                    <div className="practice__sentence-panel">
                        <span className="practice__sentence-label">Read this sentence</span>
                        <p className="practice__sentence-text">{currentSentence?.text}</p>

                        {/* IPA Transcription placeholder */}
                        {currentSentence?.phoneme_sequence && (
                            <div className="practice__ipa">
                                /{currentSentence.phoneme_sequence.slice(0, 8).join(' ')}/...
                            </div>
                        )}

                        {/* Target Phonemes */}
                        {currentSentence?.target_phonemes && currentSentence.target_phonemes.length > 0 && (
                            <div className="practice__phoneme-focus">
                                {currentSentence.target_phonemes.map((phoneme, idx) => (
                                    <span key={idx} className="practice__phoneme-tag">
                                        Focus: <span>/{phoneme}/</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Reference Audio Button */}
                        <button
                            className={`practice__reference-audio ${isPlayingReference ? 'practice__reference-audio--playing' : ''}`}
                            type="button"
                            onClick={playReferenceAudio}
                            disabled={isLoadingReference}
                        >
                            <div className="practice__reference-audio-icon">
                                {isLoadingReference ? (
                                    <Spinner size="sm" />
                                ) : isPlayingReference ? (
                                    <Pause size={24} />
                                ) : (
                                    <Volume2 size={24} />
                                )}
                            </div>
                            <div className="practice__reference-audio-text">
                                <span>{isLoadingReference ? 'Loading...' : isPlayingReference ? 'Playing...' : 'Listen to Example'}</span>
                                <span>Hear the correct pronunciation</span>
                            </div>
                        </button>
                    </div>
                </section>

                {/* Right Column - The Action */}
                <section className="practice__action-column">
                    {/* Recorder Panel */}
                    {!assessment && (
                        <div className="practice__recorder-panel">
                            {/* Waveform Visualizer */}
                            <WaveformVisualizer
                                isRecording={isRecording}
                                audioStream={audioStream}
                            />

                            {/* Recording Stats */}
                            <div className="practice__recording-stats">
                                <div className="practice__stat">
                                    <span className="practice__stat-value">{formatTime(duration)}</span>
                                    <span className="practice__stat-label">/ {formatTime(maxDuration)}</span>
                                </div>

                                {isRecording && (
                                    <div className="practice__recording-indicator">
                                        <span className="practice__recording-pulse" />
                                        <span className="practice__recording-text">Recording</span>
                                    </div>
                                )}
                            </div>

                            {/* Confidence Meter - Real-time volume feedback */}
                            <ConfidenceMeter
                                audioStream={audioStream}
                                isRecording={isRecording}
                            />

                            {/* Playback audio element */}
                            {audioUrl && <audio ref={audioRef} src={audioUrl} />}

                            {/* Action Buttons */}
                            <div className="practice__action-buttons">
                                {!isRecording && !hasRecording && (
                                    <button
                                        type="button"
                                        className="practice__action-btn practice__action-btn--record"
                                        onClick={startRecording}
                                    >
                                        <Mic size={20} />
                                        <span>Start Recording</span>
                                    </button>
                                )}

                                {isRecording && (
                                    <button
                                        type="button"
                                        className="practice__action-btn practice__action-btn--stop"
                                        onClick={stopRecording}
                                    >
                                        <Square size={20} />
                                        <span>Stop</span>
                                    </button>
                                )}

                                {hasRecording && !isRecording && (
                                    <>
                                        <button
                                            type="button"
                                            className="practice__action-btn practice__action-btn--retry"
                                            onClick={cancelRecording}
                                        >
                                            <RotateCcw size={20} />
                                            <span>Retry</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="practice__action-btn"
                                            onClick={togglePlayback}
                                        >
                                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                            <span>{isPlaying ? 'Pause' : 'Play'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="practice__action-btn practice__action-btn--submit"
                                            onClick={handleSubmit}
                                            disabled={isAssessing}
                                        >
                                            <Send size={20} />
                                            <span>Submit</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Analyzing State */}
                    {isAssessing && (
                        <div className="practice__analyzing">
                            <Spinner size="lg" />
                            <span className="practice__analyzing-text">Analyzing your pronunciation...</span>
                        </div>
                    )}

                    {/* Content Mismatch Error - User said wrong sentence */}
                    {assessmentError?.type === 'content_mismatch' && (
                        <ContentMismatchError
                            error={assessmentError}
                            onRetry={handleTryAgain}
                        />
                    )}

                    {/* Unscorable Error - Technical issue */}
                    {assessmentError?.type === 'unscorable' && (
                        <UnscorableError
                            error={assessmentError}
                            onRetry={handleTryAgain}
                        />
                    )}

                    {/* Assessment Results */}
                    {assessment && (
                        <div className="practice__results-panel">
                            {/* Score Display */}
                            <div className="practice__score-display">
                                <ScoreRing score={assessment.overall_score} />
                                <div className="practice__score-info">
                                    <div
                                        className={`practice__score-label ${assessment.overall_score >= 0.7 ? 'practice__score-label--good' : 'practice__score-label--needs-work'}`}
                                        data-tooltip={assessment.overall_score >= 0.7
                                            ? 'Excellent pronunciation! You can move to harder sentences.'
                                            : `Score ${Math.round(assessment.overall_score * 100)}% - Try focusing on the highlighted phonemes below.`}
                                    >
                                        {assessment.overall_score >= 0.7 ? (
                                            <>
                                                <CheckCircle size={24} className="practice__score-icon" />
                                                <span>Great job!</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={24} className="practice__score-icon" />
                                                <span>Keep practicing</span>
                                            </>
                                        )}
                                    </div>
                                    {assessment.fluency_score && (
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                                            Fluency: {Math.round(assessment.fluency_score * 100)}%
                                        </span>
                                    )}
                                </div>
                            </div>


                            {/* Letter-by-Letter Highlighting - Shows actual word/letter accuracy */}
                            {assessment.mistakes?.letter_highlighting && (
                                <LetterHighlight
                                    letterHighlighting={assessment.mistakes.letter_highlighting}
                                    showStats={true}
                                />
                            )}


                            {/* Weak Phonemes - Focus Areas */}
                            {assessment.weak_phonemes?.length > 0 && (
                                <div className="practice__weak-phonemes">
                                    <h4>Focus Areas</h4>
                                    <div className="practice__weak-phonemes-list">
                                        {assessment.weak_phonemes.map((phoneme, idx) => (
                                            <span key={idx} className="practice__weak-phoneme">
                                                <span className="practice__weak-phoneme-symbol">/{phoneme}/</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Result Actions */}
                            <div className="practice__result-actions">
                                <button
                                    type="button"
                                    className="practice__action-btn practice__action-btn--retry"
                                    onClick={handleTryAgain}
                                >
                                    <RotateCcw size={20} />
                                    <span>Try Again</span>
                                </button>
                                {currentIndex < sentences.length - 1 && (
                                    <button
                                        type="button"
                                        className="practice__action-btn practice__action-btn--submit"
                                        onClick={handleNext}
                                    >
                                        <span>Next Sentence</span>
                                        <ChevronRight size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            {/* Insight Zone - Metrics & Recommendations */}
            {assessment && (
                <section className="practice__insight-zone">
                    <div className="practice__metrics-row">
                        <MetricCard
                            label="Accuracy"
                            value={Math.round(assessment.overall_score * 100)}
                            unit="%"
                            icon={Target}
                            trend={assessment.overall_score >= 0.7 ? 'up' : 'down'}
                        />
                        <MetricCard
                            label="Fluency"
                            value={assessment.fluency_score ? Math.round(assessment.fluency_score * 100) : '--'}
                            unit={assessment.fluency_score ? '%' : ''}
                            icon={Gauge}
                            trend={assessment.fluency_score >= 0.7 ? 'up' : assessment.fluency_score >= 0.5 ? 'neutral' : 'down'}
                        />
                        <MetricCard
                            label="Clarity"
                            value={assessment.clarity_score ? Math.round(assessment.clarity_score * 100) : Math.round(assessment.overall_score * 100)}
                            unit="%"
                            icon={BarChart3}
                            trend={assessment.clarity_score >= 0.7 ? 'up' : assessment.clarity_score >= 0.5 ? 'neutral' : 'down'}
                        />
                        <RecommendationCard
                            weakPhonemes={assessment.weak_phonemes || []}
                            overallScore={assessment.overall_score}
                            onAction={(type) => {
                                if (type === 'advance' && currentIndex < sentences.length - 1) {
                                    handleNext();
                                } else if (type === 'retry' || type === 'learn') {
                                    handleTryAgain();
                                } else if (type === 'practice') {
                                    navigate('/phonemes');
                                }
                            }}
                        />
                    </div>

                    {/* Advanced Insights - Collapsible Panel */}
                    <InsightsPanel isOpen={true} title="Advanced Insights & AI Feedback">
                        <div className="insights-grid">
                            <AIRecommendations
                                assessment={assessment}
                                currentSentence={currentSentence}
                            />
                            <ComparisonVisualizer
                                userAudioUrl={audioUrl}
                                referenceAudioUrl={cachedAudioUrl}
                            />
                        </div>
                    </InsightsPanel>
                </section>
            )}


            {/* Navigation */}
            <footer className="practice__nav">
                <button
                    type="button"
                    className="practice__nav-btn"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft size={20} />
                    <span>Previous</span>
                </button>
                <button
                    type="button"
                    className="practice__nav-btn"
                    onClick={handleNext}
                    disabled={currentIndex >= sentences.length - 1}
                >
                    <span>Next</span>
                    <ChevronRight size={20} />
                </button>
            </footer>
        </div>
    );
}

export default Practice;
