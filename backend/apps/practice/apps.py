import threading
import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class PracticeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.practice'
    verbose_name = 'Practice Sessions'
    
    def ready(self):
        # Import signals to register handlers
        import apps.practice.signals
        
        # Pre-warm all ML models in background thread (skip on Render free tier)
        from django.conf import settings
        if getattr(settings, 'ENABLE_ML_MODELS', True):
            threading.Thread(target=self._preload_models, daemon=True).start()
        else:
            logger.info("[STARTUP] ML models DISABLED (ENABLE_ML_MODELS=false). "
                       "Auth, library, and reference audio still work.")
    
    @staticmethod
    def _preload_models():
        """Pre-load all ML models at server startup (runs in background thread)."""
        import time
        start = time.time()
        
        try:
            logger.info("[STARTUP] Pre-warming ML models...")
            
            # 1. Whisper ASR model (~5s)
            from nlp_core.asr_validator import _get_whisper_model
            _get_whisper_model()
            logger.info(f"[STARTUP] Whisper loaded ({time.time()-start:.1f}s)")
            
            # 2. Forced alignment model (~6s)
            from nlp_core.alignment.models import get_forced_alignment_model
            get_forced_alignment_model()
            logger.info(f"[STARTUP] Forced alignment loaded ({time.time()-start:.1f}s)")
            
            # 3. Wav2Vec2 embedding model (~6s)
            from nlp_core.vectorizer import get_embedding_model
            get_embedding_model()
            logger.info(f"[STARTUP] Wav2Vec2 loaded ({time.time()-start:.1f}s)")
            
            # 4. LLM service clients (Groq + Cerebras)
            from services.llm_service import get_llm_service
            get_llm_service()
            logger.info(f"[STARTUP] LLM clients loaded ({time.time()-start:.1f}s)")
            
            logger.info(f"[STARTUP] All models pre-warmed in {time.time()-start:.1f}s")
            
        except Exception as e:
            logger.warning(f"[STARTUP] Model pre-warming failed (will lazy-load): {e}")
