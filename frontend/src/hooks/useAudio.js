/**
 * useAudio Hook
 * MediaRecorder abstraction with permission handling and error states
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Audio states
export const AUDIO_STATES = {
    IDLE: 'idle',
    REQUESTING: 'requesting',
    DENIED: 'denied',
    RECORDING: 'recording',
    PROCESSING: 'processing',
    ERROR: 'error',
};

// Error messages
const ERROR_MESSAGES = {
    NotAllowedError: 'Microphone access was denied. Please allow microphone access and try again.',
    NotFoundError: 'No microphone found. Please connect a microphone and try again.',
    NotReadableError: 'Microphone is busy. Please close other apps using the microphone.',
    OverconstrainedError: 'Microphone settings are not supported by your device.',
    SecurityError: 'Microphone access requires a secure connection (HTTPS).',
    AbortError: 'Recording was aborted.',
    default: 'An error occurred while recording. Please try again.',
};

/**
 * Check if browser supports audio recording
 */
export function isAudioSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

/**
 * Check if HTTPS (required for microphone)
 */
export function isSecureContext() {
    return window.isSecureContext || location.hostname === 'localhost';
}

/**
 * Get supported MIME type for audio recording
 */
function getSupportedMimeType() {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
    ];

    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }

    return 'audio/webm';
}

/**
 * useAudio hook for recording functionality
 */
export function useAudio({ maxDuration = 30, onRecordingComplete } = {}) {
    const [state, setState] = useState(AUDIO_STATES.IDLE);
    const [error, setError] = useState(null);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    // Check browser support
    const isSupported = isAudioSupported();
    const isSecure = isSecureContext();

    /**
     * Cleanup resources
     */
    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }

        mediaRecorderRef.current = null;
        chunksRef.current = [];
    }, [audioUrl]);

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    /**
     * Request microphone permission
     */
    const requestPermission = useCallback(async () => {
        if (!isSupported) {
            setError('Your browser does not support audio recording. Please use Chrome or Firefox.');
            setState(AUDIO_STATES.ERROR);
            return false;
        }

        if (!isSecure) {
            setError('Microphone access requires a secure connection (HTTPS).');
            setState(AUDIO_STATES.ERROR);
            return false;
        }

        setState(AUDIO_STATES.REQUESTING);
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                },
            });

            streamRef.current = stream;
            setState(AUDIO_STATES.IDLE);
            return true;
        } catch (err) {
            const message = ERROR_MESSAGES[err.name] || ERROR_MESSAGES.default;
            setError(message);
            setState(err.name === 'NotAllowedError' ? AUDIO_STATES.DENIED : AUDIO_STATES.ERROR);
            return false;
        }
    }, [isSupported, isSecure]);

    /**
     * Start recording
     */
    const startRecording = useCallback(async () => {
        // Reset state
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
        chunksRef.current = [];

        // Get permission if not already granted
        if (!streamRef.current) {
            const granted = await requestPermission();
            if (!granted) return false;
        }

        try {
            const mimeType = getSupportedMimeType();
            const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                setState(AUDIO_STATES.PROCESSING);

                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);

                setAudioBlob(blob);
                setAudioUrl(url);
                setState(AUDIO_STATES.IDLE);

                // NOTE: Do NOT auto-submit here.
                // User reviews the recording first, then clicks Submit manually.
            };

            mediaRecorder.onerror = () => {
                setError('Recording failed. Please try again.');
                setState(AUDIO_STATES.ERROR);
                cleanup();
            };

            // Start recording
            mediaRecorder.start(100); // Collect data every 100ms
            startTimeRef.current = Date.now();
            setState(AUDIO_STATES.RECORDING);

            // Duration timer
            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setDuration(elapsed);

                // Auto-stop at max duration
                if (elapsed >= maxDuration) {
                    stopRecording();
                }
            }, 100);

            return true;
        } catch (err) {
            setError('Failed to start recording. Please try again.');
            setState(AUDIO_STATES.ERROR);
            return false;
        }
    }, [maxDuration, requestPermission, cleanup]);

    /**
     * Stop recording
     */
    const stopRecording = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    /**
     * Cancel recording
     */
    const cancelRecording = useCallback(() => {
        cleanup();
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
        setError(null);
        setState(AUDIO_STATES.IDLE);
    }, [cleanup]);

    /**
     * Retry after error or denial
     */
    const retry = useCallback(() => {
        cleanup();
        setError(null);
        setState(AUDIO_STATES.IDLE);
    }, [cleanup]);

    return {
        // State
        state,
        error,
        duration,
        audioBlob,
        audioUrl,

        // Computed
        isSupported,
        isSecure,
        isRecording: state === AUDIO_STATES.RECORDING,
        isProcessing: state === AUDIO_STATES.PROCESSING,
        isDenied: state === AUDIO_STATES.DENIED,
        hasRecording: !!audioBlob,
        maxDuration,

        // Actions
        requestPermission,
        startRecording,
        stopRecording,
        cancelRecording,
        retry,
        cleanup,
    };
}

export default useAudio;
