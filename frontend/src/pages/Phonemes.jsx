/**
 * Phonemes Page
 * Browse 44 English phonemes with articulation tips
 */

import { useState, useEffect } from 'react';
import { Search, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { ENDPOINTS } from '../api/endpoints';
import { Card } from '../components/Card';
import { Spinner } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { Modal } from '../components/Modal';
import './Phonemes.css';

const PHONEME_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'vowel', label: 'Vowels' },
    { id: 'consonant', label: 'Consonants' },
];

const ITEMS_PER_PAGE = 20;

export function Phonemes() {
    const { data: phonemes, isLoading, error, refetch } = useApi(ENDPOINTS.PHONEMES.LIST);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedPhoneme, setSelectedPhoneme] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Handle both array and paginated response { results: [...] }
    const phonemesArray = phonemes
        ? (Array.isArray(phonemes) ? phonemes : (phonemes.results || phonemes.data || []))
        : [];

    // Define which phoneme types belong to each category
    const VOWEL_TYPES = ['vowel', 'diphthong'];
    const CONSONANT_TYPES = ['consonant', 'fricative', 'plosive', 'nasal', 'liquid', 'glide', 'affricate'];

    const filteredPhonemes = phonemesArray.filter((phoneme) => {
        const matchesSearch =
            (phoneme.symbol || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (phoneme.ipa || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (phoneme.example_word || '').toLowerCase().includes(searchQuery.toLowerCase());

        const phonemeType = (phoneme.category || phoneme.type || '').toLowerCase();
        let matchesCategory = true;

        if (activeCategory === 'vowel') {
            matchesCategory = VOWEL_TYPES.includes(phonemeType);
        } else if (activeCategory === 'consonant') {
            matchesCategory = CONSONANT_TYPES.includes(phonemeType);
        }
        // 'all' matches everything

        return matchesSearch && matchesCategory;
    });

    // Reset page when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeCategory]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredPhonemes.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedPhonemes = filteredPhonemes.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            // Scroll to top of grid
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (isLoading) {
        return (
            <div className="phonemes-loading">
                <Spinner size="lg" />
                <p>Loading phonemes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="phonemes-error">
                <ErrorState
                    icon="server"
                    title="Failed to load phonemes"
                    message="We could not load the phoneme library. Please try again."
                    onRetry={refetch}
                />
            </div>
        );
    }

    return (
        <div className="phonemes">
            <header className="phonemes__header">
                <div className="phonemes__title-section">
                    <h1 className="phonemes__title">Phoneme Library</h1>
                    <p className="phonemes__subtitle">
                        Explore the 44 sounds of English and learn how to pronounce them
                    </p>
                </div>

                <div className="phonemes__filters">
                    {/* Search */}
                    <div className="phonemes__search">
                        <Search className="phonemes__search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search phonemes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="phonemes__search-input"
                        />
                    </div>

                    {/* Category tabs */}
                    <div className="phonemes__tabs">
                        {PHONEME_CATEGORIES.map((category) => (
                            <button
                                key={category.id}
                                type="button"
                                className={`phonemes__tab ${activeCategory === category.id ? 'phonemes__tab--active' : ''
                                    }`}
                                onClick={() => setActiveCategory(category.id)}
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="phonemes__grid">
                {paginatedPhonemes.map((phoneme) => (
                    <Card
                        key={phoneme.id}
                        hover
                        className="phoneme-card"
                        onClick={() => setSelectedPhoneme(phoneme)}
                    >
                        <div className="phoneme-card__symbol">{phoneme.ipa}</div>
                        <div className="phoneme-card__info">
                            <span className="phoneme-card__arpabet">{phoneme.symbol}</span>
                            {phoneme.example_word && (
                                <span className="phoneme-card__example">
                                    {phoneme.example_word}
                                </span>
                            )}
                        </div>
                        <div
                            className="phoneme-card__action"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhoneme(phoneme);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    setSelectedPhoneme(phoneme);
                                }
                            }}
                            aria-label={`Learn more about ${phoneme.symbol}`}
                        >
                            <Info size={16} />
                        </div>
                    </Card>
                ))}
            </main>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="phonemes__pagination">
                    <button
                        type="button"
                        className="phonemes__pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div className="phonemes__pagination-pages">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                type="button"
                                className={`phonemes__pagination-page ${currentPage === page ? 'phonemes__pagination-page--active' : ''
                                    }`}
                                onClick={() => handlePageChange(page)}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="phonemes__pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                    >
                        <ChevronRight size={18} />
                    </button>

                    <span className="phonemes__pagination-info">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredPhonemes.length)} of {filteredPhonemes.length}
                    </span>
                </div>
            )}

            {paginatedPhonemes.length === 0 && (
                <div className="phonemes__no-results">
                    <p>No phonemes found matching your search.</p>
                </div>
            )}

            {/* Phoneme Detail Modal */}
            <Modal
                isOpen={!!selectedPhoneme}
                onClose={() => setSelectedPhoneme(null)}
                title={`Phoneme: ${selectedPhoneme?.symbol || ''}`}
                size="md"
            >
                {selectedPhoneme && (
                    <div className="phoneme-detail">
                        <div className="phoneme-detail__header">
                            <div className="phoneme-detail__symbol">{selectedPhoneme.ipa}</div>
                            <div className="phoneme-detail__meta">
                                <span className="phoneme-detail__arpabet">{selectedPhoneme.symbol}</span>
                                <span className="phoneme-detail__category">
                                    {selectedPhoneme.category || selectedPhoneme.type}
                                </span>
                            </div>
                        </div>

                        {selectedPhoneme.example_word && (
                            <div className="phoneme-detail__section">
                                <h3>Example Word</h3>
                                <p className="phoneme-detail__example">
                                    <strong>{selectedPhoneme.example_word}</strong>
                                </p>
                            </div>
                        )}

                        {(selectedPhoneme.articulation_tips || selectedPhoneme.articulation_tip) && (
                            <div className="phoneme-detail__section">
                                <h3>How to Pronounce</h3>
                                <p>{selectedPhoneme.articulation_tips || selectedPhoneme.articulation_tip}</p>
                            </div>
                        )}

                        {selectedPhoneme.common_mistakes && (
                            <div className="phoneme-detail__section">
                                <h3>Common Mistakes</h3>
                                <p>{selectedPhoneme.common_mistakes}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Phonemes;
