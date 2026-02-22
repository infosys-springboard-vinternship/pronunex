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
import { useMutation } from '../hooks/useApi';
import { useUI } from '../context/UIContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { Spinner } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { DifficultyBadge, MetricCard, RecommendationCard, ConfidenceMeter, LevelSelector, SublevelSelector, SublevelSummary, SessionProgressIndicator, ReinforcementBlock } from '../components/practice';
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
        const cached = localStorage.getItem('practice_selectedLevel');
        return cached || null;
    });

    // Sublevel selection — null means show sublevel selector screen
    const [selectedSublevel, setSelectedSublevel] = useState(() => {
        const cached = localStorage.getItem('practice_selectedSublevel');
        return cached || null;
    });

    // Sublevel summary state
    const [showSublevelSummary, setShowSublevelSummary] = useState(false);

    // Backend sublevel session ID (tracks the SublevelSession record)
    const [sublevelSessionId, setSublevelSessionId] = useState(null);

    // Loading/error state for sublevel session fetch
    const [isLoadingSession, setIsLoadingSession] = useState(false);
    const [sessionError, setSessionError] = useState(null);

    // Sentences and assessment state
    const [sentences, setSentences] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const activeDifficulty = selectedLevel || settings.defaultDifficulty;

    const { mutate, isLoading: isAssessing } = useMutation();

    // State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [assessment, setAssessment] = useState(null);
    const [sessionId, setSessionId] = useState(null);

    // Recording state (not persisted - audio blobs can't be stored)
    const [isRecording, setIsRecording] = useState(false);
    const [hasRecording, setHasRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [duration, setDuration] = useState(0);
    const [audioStream, setAudioStream] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [assessmentError, setAssessmentError] = useState(null); // For content_mismatch/unscorable errors

    // Sublevel reinforcement state (Feature 2)
    const [sublevelRecommendations, setSublevelRecommendations] = useState(null);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

    // Weak-set practice mode — practice recommended sentences for weak phonemes
    const [isWeakSetMode, setIsWeakSetMode] = useState(false);
    const [weakSetOriginalSentences, setWeakSetOriginalSentences] = useState([]);

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

    // Persist selectedLevel to localStorage
    useEffect(() => {
        if (selectedLevel) {
            localStorage.setItem('practice_selectedLevel', selectedLevel);
        } else {
            localStorage.removeItem('practice_selectedLevel');
        }
    }, [selectedLevel]);

    // Persist selectedSublevel to localStorage
    useEffect(() => {
        if (selectedSublevel) {
            localStorage.setItem('practice_selectedSublevel', selectedSublevel);
        } else {
            localStorage.removeItem('practice_selectedSublevel');
        }
    }, [selectedSublevel]);

    // --- Backend Sublevel Session: fetch fixed sentences on level+sublevel selection ---
    const fetchSublevelSession = async (level, sublevel) => {
        if (!level || !sublevel) return;

        setIsLoading(true);
        setError(null);
        setSessionError(null);

        try {
            const url = `${ENDPOINTS.PRACTICE.SUBLEVEL_SESSION}?level=${level}&sublevel=${sublevel}`;
            const { data } = await api.get(url);

            // data contains: { id, sentences, sentence_ids, current_index, assessment_results }
            setSublevelSessionId(data.id);
            setSentences(data.sentences || []);
            setCurrentIndex(data.current_index || 0);

            // Restore backend assessment results
            const cachedResults = data.assessment_results || {};
            setBackendAssessmentResults(cachedResults);

            // Check if all sentences are already completed → show summary
            const sentenceIds = data.sentence_ids || [];
            const allCompleted = sentenceIds.length > 0 && sentenceIds.every(id => cachedResults[String(id)]);

            if (allCompleted) {
                // Sublevel already finished — go straight to summary
                setShowSublevelSummary(true);

                // Re-fetch reinforcement recommendations for the summary page
                setIsLoadingRecommendations(true);
                api.get(ENDPOINTS.PRACTICE.SUBLEVEL_SUMMARY(level, sublevel))
                    .then(res => { if (res?.data) setSublevelRecommendations(res.data); })
                    .catch(err => console.warn('Failed to fetch recommendations on revisit:', err))
                    .finally(() => setIsLoadingRecommendations(false));
            } else {
                // Restore cached assessment for current sentence
                const currentSid = sentenceIds[data.current_index || 0];
                if (currentSid && cachedResults[String(currentSid)]) {
                    setAssessment(cachedResults[String(currentSid)]);
                } else {
                    setAssessment(null);
                }
            }
        } catch (err) {
            console.error('Failed to fetch sublevel session:', err);
            setError(err);
            setSessionError('Failed to load practice sentences.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch sublevel session when both level and sublevel are selected
    useEffect(() => {
        if (selectedLevel && selectedSublevel) {
            fetchSublevelSession(selectedLevel, selectedSublevel);
        }
    }, [selectedLevel, selectedSublevel]);

    // Save progress to backend (current_index + assessment_results)
    // Skips saving if in weak-set mode (no SublevelSession for weak sets)
    const saveProgressToBackend = async (index, assessmentResultsUpdate) => {
        if (isWeakSetMode) return; // Weak-set mode — assessments saved via uploadAudio
        if (!sublevelSessionId || !selectedLevel || !selectedSublevel) return;

        try {
            const payload = {
                level: selectedLevel,
                sublevel: selectedSublevel,
            };
            if (index !== undefined) {
                payload.current_index = index;
            }
            if (assessmentResultsUpdate) {
                payload.assessment_results = assessmentResultsUpdate;
            }
            await api.patch(ENDPOINTS.PRACTICE.SUBLEVEL_SESSION, payload);
        } catch (err) {
            console.warn('Failed to save progress to backend:', err);
        }
    };

    // Compute completed count and average score from backend-persisted assessment results
    const [backendAssessmentResults, setBackendAssessmentResults] = useState({});

    // Load assessment results from backend session when sentences arrive
    useEffect(() => {
        if (sublevelSessionId && selectedLevel && selectedSublevel) {
            const loadResults = async () => {
                try {
                    const url = `${ENDPOINTS.PRACTICE.SUBLEVEL_SESSION}?level=${selectedLevel}&sublevel=${selectedSublevel}`;
                    const { data } = await api.get(url);
                    setBackendAssessmentResults(data.assessment_results || {});
                } catch (err) {
                    // Silent — results already loaded from initial fetch
                }
            };
            // Only re-load if we don't have results yet
            if (Object.keys(backendAssessmentResults).length === 0) {
                loadResults();
            }
        }
    }, [sublevelSessionId]);

    const assessmentResults = backendAssessmentResults;
    const completedCount = sentences.length > 0
        ? sentences.filter(s => assessmentResults[String(s.id)]).length
        : 0;
    const averageScore = completedCount > 0
        ? sentences.reduce((sum, s) => {
            const r = assessmentResults[String(s.id)];
            return sum + (r ? (r.overall_score || 0) : 0);
        }, 0) / completedCount
        : 0;

    // Validate currentIndex against loaded sentences
    useEffect(() => {
        if (sentences?.length > 0 && currentIndex >= sentences.length) {
            setCurrentIndex(0);
        }
    }, [sentences, currentIndex]);

    // Load assessment result for current sentence from backend cache when navigating
    useEffect(() => {
        if (currentSentence) {
            const cachedAssessment = backendAssessmentResults[String(currentSentence.id)];
            if (cachedAssessment) {
                setAssessment(cachedAssessment);
            } else {
                setAssessment(null);
            }
        }
    }, [currentSentence?.id, backendAssessmentResults]);


    // Create session on mount (only if no persisted session)
    useEffect(() => {
        const createSession = async () => {
            // Skip if we already have a session from storage
            if (sessionId) return;

            try {
                const { data } = await api.post(ENDPOINTS.PRACTICE.SESSIONS.CREATE, {});
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
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // Cancel/retry recording
    const cancelRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioBlob(null);
        setAudioUrl(null);
        setHasRecording(false);
        setDuration(0);
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

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

            // Success - set assessment data (scores arrive instantly)
            setAssessment(data);
            toast.success('Assessment complete!');

            // Poll for async LLM feedback if pending
            if (data.llm_feedback_pending && data.attempt_id) {
                const pollForFeedback = async (attemptId, retries = 3) => {
                    for (let i = 0; i < retries; i++) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between polls
                        try {
                            const fbRes = await api.get(ENDPOINTS.PRACTICE.ATTEMPT_FEEDBACK(attemptId));
                            if (fbRes?.data?.ready && fbRes.data.llm_feedback) {
                                // Update assessment with LLM feedback (seamless UI update)
                                setAssessment(prev => prev ? { ...prev, llm_feedback: fbRes.data.llm_feedback, llm_feedback_pending: false } : prev);
                                // Also update cached results
                                if (currentSentence) {
                                    setBackendAssessmentResults(prev => {
                                        const sid = String(currentSentence.id);
                                        if (prev[sid]) {
                                            return { ...prev, [sid]: { ...prev[sid], llm_feedback: fbRes.data.llm_feedback, llm_feedback_pending: false } };
                                        }
                                        return prev;
                                    });
                                }
                                return; // Done
                            }
                        } catch (err) {
                            // Silent - fallback feedback already showing
                        }
                    }
                };
                pollForFeedback(data.attempt_id); // Fire and forget
            }

            // Cache this assessment result for this sentence on backend
            const resultUpdate = { [String(currentSentence.id)]: data };
            setBackendAssessmentResults(prev => ({ ...prev, ...resultUpdate }));
            await saveProgressToBackend(currentIndex, resultUpdate);

            // Check if all 5 sentences are now completed → auto-trigger sublevel summary
            const completedCount = sentences ? sentences.filter(s => {
                const rid = String(s.id);
                return resultUpdate[rid] || backendAssessmentResults[rid];
            }).length : 0;
            if (completedCount >= (sentences?.length || 5)) {
                // Calculate average score across all sentences
                const mergedResults = { ...backendAssessmentResults, ...resultUpdate };
                const totalScore = sentences.reduce((sum, s) => {
                    const result = mergedResults[String(s.id)];
                    return sum + (result?.overall_score || 0);
                }, 0);
                const avgScore = totalScore / sentences.length;

                if (isWeakSetMode) {
                    // Weak-set completion — don't re-post SUBLEVEL_COMPLETE
                    // Just show the summary after a brief delay
                    setTimeout(() => {
                        setShowSublevelSummary(true);
                        setIsWeakSetMode(false);
                        // Restore original sentences for the summary view
                        if (weakSetOriginalSentences.length > 0) {
                            setSentences(weakSetOriginalSentences);
                            setWeakSetOriginalSentences([]);
                        }
                        // Re-fetch fresh recommendations
                        setIsLoadingRecommendations(true);
                        api.get(ENDPOINTS.PRACTICE.SUBLEVEL_SUMMARY(selectedLevel, selectedSublevel))
                            .then(res => { if (res?.data) setSublevelRecommendations(res.data); })
                            .catch(err => console.warn('Failed to fetch summary:', err))
                            .finally(() => setIsLoadingRecommendations(false));
                        // Re-fetch session results
                        fetchSublevelSession(selectedLevel, selectedSublevel);
                    }, 2500);
                    toast.success(`Weak set complete! Average: ${Math.round(avgScore * 100)}%`);
                    return;
                }

                // Save sublevel completion to backend
                try {
                    await api.post(ENDPOINTS.PRACTICE.SUBLEVEL_COMPLETE, {
                        level: selectedLevel,
                        sublevel: selectedSublevel,
                        average_score: avgScore,
                        attempts: sentences.length,
                    });
                } catch (err) {
                    console.error('Failed to save sublevel completion:', err);
                }

                // Show sublevel summary after a brief delay to show final result
                setTimeout(() => {
                    setShowSublevelSummary(true);

                    // Fetch sublevel summary with reinforcement sentences
                    setIsLoadingRecommendations(true);
                    api.get(ENDPOINTS.PRACTICE.SUBLEVEL_SUMMARY(selectedLevel, selectedSublevel))
                        .then(summaryResponse => {
                            if (summaryResponse?.data) {
                                setSublevelRecommendations(summaryResponse.data);
                            }
                        })
                        .catch(summaryErr => console.warn('Failed to fetch sublevel summary:', summaryErr))
                        .finally(() => setIsLoadingRecommendations(false));
                }, 2500);

                return; // Don't auto-advance, summary will show
            }

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
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            // Persist current_index to backend
            saveProgressToBackend(nextIndex);
            // Assessment will be auto-loaded from cache via useEffect
            setAssessmentError(null);
            cancelRecording();
        } else {
            // Last sentence completed - show sublevel summary
            const completedSentences = sentences.filter(s => backendAssessmentResults[String(s.id)]);

            if (completedSentences.length === sentences.length) {
                // Calculate average score
                const totalScore = completedSentences.reduce((sum, s) => {
                    const result = backendAssessmentResults[String(s.id)];
                    return sum + (result.overall_score || 0);
                }, 0);
                const avgScore = totalScore / completedSentences.length;

                // Save sublevel completion to backend
                try {
                    await api.post(ENDPOINTS.PRACTICE.SUBLEVEL_COMPLETE, {
                        level: selectedLevel,
                        sublevel: selectedSublevel,
                        average_score: avgScore,
                        attempts: sentences.length
                    });
                } catch (err) {
                    console.error('Failed to save sublevel completion:', err);
                }

                // Show summary
                setShowSublevelSummary(true);

                // Fetch sublevel summary with reinforcement sentences
                setIsLoadingRecommendations(true);
                try {
                    const summaryResponse = await api.get(ENDPOINTS.PRACTICE.SUBLEVEL_SUMMARY(selectedLevel, selectedSublevel));
                    if (summaryResponse?.data) {
                        setSublevelRecommendations(summaryResponse.data);
                    }
                } catch (summaryErr) {
                    console.warn('Failed to fetch sublevel summary:', summaryErr);
                } finally {
                    setIsLoadingRecommendations(false);
                }
            }
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            // Persist current_index to backend
            saveProgressToBackend(prevIndex);
            // Assessment will be auto-loaded from cache via useEffect
            setAssessmentError(null);
            cancelRecording();
        }
    };

    const handleTryAgain = () => {
        // Clear current sentence's cached assessment from backend results
        if (currentSentence) {
            const sid = String(currentSentence.id);
            setBackendAssessmentResults(prev => {
                const updated = { ...prev };
                delete updated[sid];
                return updated;
            });
            // Note: we don't persist the deletion to backend — the new result
            // will overwrite when they re-record
        }

        setAssessment(null);
        setAssessmentError(null);
        cancelRecording();
    };

    // Reset practice state — shared helper for level/sublevel changes
    const resetPracticeState = () => {
        setCurrentIndex(0);
        setAssessment(null);
        setAssessmentError(null);
        cancelRecording();
        setSentences([]);
        setSublevelSessionId(null);
        setBackendAssessmentResults({});
    };

    // Reset entire session and start fresh — returns to level selector
    const handleStartFresh = async () => {
        // Clear localStorage keys
        localStorage.removeItem('practice_selectedLevel');
        localStorage.removeItem('practice_selectedSublevel');

        // Reset all state
        setSelectedLevel(null);
        setSelectedSublevel(null);
        resetPracticeState();

        // Session will be created when level is selected again
        toast.success('Session reset! Choose a new level.');
    };

    // Change level handler — goes back to level selector
    const handleChangeLevel = () => {
        localStorage.removeItem('practice_selectedLevel');
        localStorage.removeItem('practice_selectedSublevel');
        setSelectedLevel(null);
        setSelectedSublevel(null);
        resetPracticeState();
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
            const { data } = await api.post(ENDPOINTS.PRACTICE.SESSIONS.CREATE, {});
            setSessionId(data.id);
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    };

    // Handle retry sublevel from summary
    const handleRetrySublevel = async () => {
        setShowSublevelSummary(false);

        // Delete the backend sublevel session to reset sentence assignment
        try {
            await api.delete(`${ENDPOINTS.PRACTICE.SUBLEVEL_SESSION}?level=${selectedLevel}&sublevel=${selectedSublevel}`);
        } catch (err) {
            console.warn('Failed to reset sublevel session:', err);
        }

        // Reset local state and re-fetch fresh sentences from backend
        resetPracticeState();
        fetchSublevelSession(selectedLevel, selectedSublevel);
    };

    // Handle next sublevel from summary
    const handleNextSublevel = async () => {
        setShowSublevelSummary(false);
        setIsWeakSetMode(false);
        const nextSublevel = selectedSublevel === '1' ? '2' : '1';
        setSelectedSublevel(nextSublevel);
        resetPracticeState();
        // Sentences will be auto-fetched via useEffect when selectedSublevel changes
    };

    // Handle "Practice Weak Set" — load recommended sentences into practice flow
    const handlePracticeWeakSet = () => {
        if (!sublevelRecommendations?.reinforcement_sentences?.length) {
            toast.error('No weak-set sentences available.');
            return;
        }

        // Save the original sentences so we can go back to the summary
        setWeakSetOriginalSentences(sentences);

        // Load the recommended sentences as the practice set
        const weakSentences = sublevelRecommendations.reinforcement_sentences;
        setSentences(weakSentences);
        setCurrentIndex(0);
        setAssessment(null);
        setAssessmentError(null);
        setBackendAssessmentResults({});
        cancelRecording();

        // Enter weak-set mode
        setIsWeakSetMode(true);
        setShowSublevelSummary(false);

        toast.success(`Practicing ${weakSentences.length} weak phoneme sentences`);
    };

    // Handle returning from weak-set practice to summary
    const handleBackFromWeakSet = () => {
        // Restore original sentences
        if (weakSetOriginalSentences.length > 0) {
            setSentences(weakSetOriginalSentences);
        }
        setIsWeakSetMode(false);
        setShowSublevelSummary(true);
        setWeakSetOriginalSentences([]);
        setCurrentIndex(0);
        setAssessment(null);
        setAssessmentError(null);
        cancelRecording();
        setBackendAssessmentResults({});

        // Re-fetch the original session's assessment results
        if (selectedLevel && selectedSublevel) {
            fetchSublevelSession(selectedLevel, selectedSublevel);
        }
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
        const results = backendAssessmentResults;
        const completedSentences = sentences.filter(s => results[String(s.id)]);

        // Calculate stats
        const totalScore = completedSentences.reduce((sum, s) => {
            return sum + (results[String(s.id)]?.overall_score || 0);
        }, 0);
        const avgScore = totalScore / Math.max(completedSentences.length, 1);

        // Collect all weak phonemes
        const allWeakPhonemes = [];
        completedSentences.forEach(s => {
            const result = results[String(s.id)];
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

        // Back handler — go to sublevel selector
        const handleBackFromSummary = () => {
            setShowSublevelSummary(false);
            setSelectedSublevel(null);
            resetPracticeState();
        };

        return (
            <div className="sublevel-summary-page">
                {/* Left column: Targeted Reinforcement */}
                <div className="sublevel-summary-page__left">
                    {!isLoadingRecommendations && sublevelRecommendations?.weak_phonemes?.length > 0 && (
                        <ReinforcementBlock
                            weakPhonemes={sublevelRecommendations.weak_phonemes}
                            recommendedSentences={sublevelRecommendations.reinforcement_sentences || []}
                            onPracticeSet={handlePracticeWeakSet}
                            onSkip={handleNextSublevel}
                        />
                    )}
                    {isLoadingRecommendations && (
                        <div className="sublevel-summary-page__loading">
                            <Spinner size="sm" />
                            <p>Loading recommendations...</p>
                        </div>
                    )}
                </div>

                {/* Right column: Summary Card */}
                <div className="sublevel-summary-page__right">
                    <SublevelSummary
                        level={selectedLevel}
                        sublevel={selectedSublevel}
                        averageScore={avgScore}
                        weakPhonemes={uniqueWeakPhonemes}
                        totalAttempts={completedSentences.length}
                        onRetry={handleRetrySublevel}
                        onNext={handleNextSublevel}
                        onBack={handleBackFromSummary}
                    />
                </div>
            </div>
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
                    onRetry={() => fetchSublevelSession(selectedLevel, selectedSublevel)}
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
                    <h1 className="practice__title">
                        {isWeakSetMode ? 'Weak Phoneme Practice' : 'Practice Session'}
                    </h1>
                    <span className="practice__progress-text">
                        {currentIndex + 1} of {sentences.length}
                    </span>
                    {isWeakSetMode ? (
                        <button
                            type="button"
                            className="practice__start-fresh-btn"
                            onClick={handleBackFromWeakSet}
                            title="Back to summary"
                        >
                            <RotateCcw size={14} />
                            <span>Back to Summary</span>
                        </button>
                    ) : currentIndex > 0 ? (
                        <button
                            type="button"
                            className="practice__start-fresh-btn"
                            onClick={handleStartFresh}
                            title="Start fresh session"
                        >
                            <RotateCcw size={14} />
                            <span>Start Fresh</span>
                        </button>
                    ) : null}
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
