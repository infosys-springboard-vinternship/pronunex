import { useNavigate } from 'react-router-dom';
import { Mic, Volume2 } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import { ENDPOINTS } from '../../../api/endpoints';
import { Spinner } from '../../Loader';
import './RecommendedSentences.css';

const FALLBACK_SENTENCES = [
    { id: 1, text: "The thick leather weather report threatened three theatres.", phonemes: ["th"] },
    { id: 2, text: "Regular rhythm really requires repetitive rehearsal.", phonemes: ["r"] },
    { id: 3, text: "She sells seashells by the seashore swiftly.", phonemes: ["sh", "s"] },
];

export function RecommendedSentences() {
    const navigate = useNavigate();
    const { data: recommended, isLoading } = useApi(
        `${ENDPOINTS.SENTENCES.RECOMMEND}?limit=3`,
    );

    const sentences = (() => {
        if (!recommended) return FALLBACK_SENTENCES;
        const list = Array.isArray(recommended) ? recommended : (recommended.results || recommended.data || []);
        if (!Array.isArray(list) || list.length === 0) return FALLBACK_SENTENCES;
        return list.slice(0, 3).map(item => ({
            id: item.id,
            text: item.text || item.sentence || '',
            phonemes: item.target_phonemes || item.phonemes || [],
        }));
    })();

    if (isLoading) {
        return (
            <div className="recommended-sentences">
                <Spinner size="sm" />
            </div>
        );
    }

    return (
        <div className="recommended-sentences">
            <header className="recommended-sentences__header">
                <h3 className="recommended-sentences__title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                    Practice These Today
                </h3>
                <span className="recommended-sentences__badge">Based on weak phonemes</span>
            </header>

            <div className="recommended-sentences__list">
                {sentences.map((sentence, idx) => (
                    <div key={sentence.id || idx} className="recommended-sentences__item">
                        <div className="recommended-sentences__content">
                            <p className="recommended-sentences__text">{sentence.text}</p>
                            {sentence.phonemes.length > 0 && (
                                <div className="recommended-sentences__phonemes">
                                    {(Array.isArray(sentence.phonemes) ? sentence.phonemes : [sentence.phonemes]).slice(0, 3).map((p, i) => (
                                        <span key={i} className="recommended-sentences__phoneme-tag">
                                            /{typeof p === 'string' ? p : p.phoneme || p}/
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            className="recommended-sentences__practice-btn"
                            onClick={() => navigate('/practice')}
                            title="Practice this sentence"
                        >
                            <Mic size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
