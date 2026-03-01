"""
Audio Cleaner Module for Pronunex.

Handles audio preprocessing: normalization, trimming, and resampling.
Reference: Adapted from Pronunex_initial_setup/src/preprocess_all.py
"""

import os
import tempfile
import logging
import librosa
import soundfile as sf
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)


def clean_audio(audio_input, output_path: str = None) -> str:
    """
    Clean and preprocess audio for pronunciation assessment.
    
    Processing steps:
    1. Convert to WAV via pydub (handles webm, m4a, ogg from browsers)
    2. Load audio with librosa (fast path via PySoundFile)
    3. Resample to 16kHz (model requirement)
    4. Trim silence from beginning and end
    5. Normalize volume
    
    Args:
        audio_input: File path (str) or Django UploadedFile
        output_path: Optional output path. If None, creates temp file.
    
    Returns:
        str: Path to cleaned audio file
    """
    config = settings.SCORING_CONFIG
    sample_rate = config.get('SAMPLE_RATE', 16000)
    trim_db = config.get('SILENCE_TRIM_DB', 20)
    
    try:
        # Handle Django UploadedFile — save to temp file first
        if hasattr(audio_input, 'read'):
            # Detect extension from content_type or filename
            content_type = getattr(audio_input, 'content_type', '') or ''
            original_name = getattr(audio_input, 'name', '') or 'audio.webm'
            
            ext_map = {
                'audio/webm': '.webm',
                'audio/ogg': '.ogg',
                'audio/mp4': '.m4a',
                'audio/x-m4a': '.m4a',
                'audio/mpeg': '.mp3',
                'audio/wav': '.wav',
                'audio/x-wav': '.wav',
            }
            suffix = ext_map.get(content_type, os.path.splitext(original_name)[1] or '.webm')
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                for chunk in audio_input.chunks():
                    tmp.write(chunk)
                input_path = tmp.name
        else:
            input_path = str(audio_input)
        
        # Step 0: Convert non-WAV formats to WAV via pydub (fast, uses ffmpeg)
        # This eliminates the slow librosa audioread fallback for WebM/M4A/OGG
        wav_path = input_path
        needs_cleanup = False
        
        if not input_path.lower().endswith('.wav'):
            try:
                from pydub import AudioSegment
                
                ext = os.path.splitext(input_path)[1].lower().lstrip('.')
                # Map extensions to pydub format names
                format_map = {'webm': 'webm', 'ogg': 'ogg', 'm4a': 'mp4', 'mp3': 'mp3', 'mp4': 'mp4'}
                fmt = format_map.get(ext, ext)
                
                audio_seg = AudioSegment.from_file(input_path, format=fmt)
                wav_path = input_path.rsplit('.', 1)[0] + '_converted.wav'
                audio_seg.export(wav_path, format='wav')
                needs_cleanup = True
                
                logger.debug(f"Converted {ext} → WAV via pydub: {wav_path}")
            except Exception as e:
                logger.warning(f"Pydub conversion failed ({e}), falling back to librosa direct load")
                wav_path = input_path
        
        # Step 1: Load audio with resampling to 16kHz (fast path: PySoundFile for WAV)
        y, sr = librosa.load(wav_path, sr=sample_rate)
        
        # Step 2: Trim silence from ends
        y_trimmed, _ = librosa.effects.trim(y, top_db=trim_db)
        
        # Step 3: Normalize volume to prevent clipping
        y_normalized = normalize_audio(y_trimmed)
        
        # Step 4: Save cleaned audio
        if output_path is None:
            # Create temp file in media directory
            media_path = settings.MEDIA_ROOT / 'user_uploads'
            os.makedirs(media_path, exist_ok=True)
            output_path = tempfile.mktemp(suffix='_clean.wav', dir=str(media_path))
        
        sf.write(output_path, y_normalized, sample_rate)
        
        logger.debug(f"Audio cleaned: {input_path} -> {output_path}")
        
        # Clean up temp files
        if hasattr(audio_input, 'read') and os.path.exists(input_path):
            os.remove(input_path)
        if needs_cleanup and os.path.exists(wav_path):
            os.remove(wav_path)
        
        return output_path
        
    except Exception as e:
        logger.error(f"Audio cleaning failed: {str(e)}")
        raise


def normalize_audio(y: np.ndarray) -> np.ndarray:
    """
    Normalize audio to prevent clipping while maintaining dynamics.
    
    Args:
        y: Audio waveform as numpy array
    
    Returns:
        np.ndarray: Normalized audio
    """
    max_val = np.max(np.abs(y))
    if max_val > 0:
        return y / max_val * 0.95  # Leave 5% headroom
    return y


def get_audio_duration(file_path: str) -> float:
    """
    Get duration of audio file in seconds.
    
    Args:
        file_path: Path to audio file
    
    Returns:
        float: Duration in seconds
    """
    y, sr = librosa.load(file_path, sr=None)
    return librosa.get_duration(y=y, sr=sr)


def split_stereo_to_mono(y: np.ndarray) -> np.ndarray:
    """
    Convert stereo audio to mono by averaging channels.
    
    Args:
        y: Audio waveform (may be stereo)
    
    Returns:
        np.ndarray: Mono audio
    """
    if len(y.shape) > 1:
        return np.mean(y, axis=0)
    return y
