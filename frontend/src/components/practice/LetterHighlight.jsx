/**
 * LetterHighlight Component
 * 
 * Displays letter-by-letter error highlighting for pronunciation feedback.
 * Shows each letter color-coded as correct (green) or incorrect (red).
 * Premium animated tooltips for error letters.
 */

import { Check, X, AlertCircle } from 'lucide-react';
import { PremiumTooltip } from './PremiumTooltip';
import './LetterHighlight.css';

/**
 * Single word with letter highlighting
 */
export function HighlightedWord({ wordData, showTooltip = true }) {
    if (!wordData) return null;

    const { word, actual, letters = [], accuracy, error_descriptions = [] } = wordData;
    const isPerfect = accuracy === 100;

    // Collect error info from incorrect letters for the word-level tooltip
    const errorLetters = letters.filter(l => !l.is_correct);
    const primaryError = errorLetters[0];

    const wordContent = (
        <span
            className={`letter-highlight__word ${isPerfect ? 'letter-highlight__word--perfect' : 'letter-highlight__word--has-errors'}`}
        >
            {letters.map((letter, idx) => (
                <span
                    key={idx}
                    className={`letter-highlight__letter ${letter.is_correct ? 'letter-highlight__letter--correct' : 'letter-highlight__letter--incorrect'}`}
                    data-error-type={letter.error_type || 'none'}
                >
                    {letter.letter}
                </span>
            ))}
            {!isPerfect && (
                <span className="letter-highlight__accuracy">
                    ({Math.round(accuracy)}%)
                </span>
            )}
        </span>
    );

    // Wrap with tooltip only for words with errors
    if (!isPerfect && showTooltip && primaryError) {
        return (
            <PremiumTooltip
                errorType={primaryError.error_type}
                expected={primaryError.expected}
                actual={primaryError.actual}
                errors={error_descriptions}
            >
                {wordContent}
            </PremiumTooltip>
        );
    }

    return wordContent;
}

/**
 * Full sentence with word and letter highlighting
 */
export function LetterHighlight({ letterHighlighting, showStats = true }) {
    if (!letterHighlighting || !letterHighlighting.words) {
        return null;
    }

    const { words, total_correct_letters, total_letters, letter_accuracy, perfect_words, word_count } = letterHighlighting;

    return (
        <div className="letter-highlight">
            <div className="letter-highlight__header">
                <span className="letter-highlight__label">Letter-by-Letter Analysis</span>
                {showStats && (
                    <span className="letter-highlight__stats">
                        {Math.round(letter_accuracy)}% accurate ({total_correct_letters}/{total_letters} letters)
                    </span>
                )}
            </div>

            <div className="letter-highlight__sentence">
                {words.map((wordData, idx) => (
                    <HighlightedWord key={idx} wordData={wordData} />
                ))}
            </div>

            {showStats && (
                <div className="letter-highlight__summary">
                    <div className="letter-highlight__stat">
                        <Check size={14} className="letter-highlight__stat-icon letter-highlight__stat-icon--good" />
                        <span>{perfect_words}/{word_count} words perfect</span>
                    </div>
                    {word_count - perfect_words > 0 && (
                        <div className="letter-highlight__stat">
                            <AlertCircle size={14} className="letter-highlight__stat-icon letter-highlight__stat-icon--warn" />
                            <span>{word_count - perfect_words} words need work</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Compact version for inline display in WordHeatmap
 */
export function CompactLetterHighlight({ letterHighlighting }) {
    if (!letterHighlighting || !letterHighlighting.words) {
        return null;
    }

    const { words } = letterHighlighting;

    return (
        <div className="letter-highlight--compact">
            {words.map((wordData, idx) => (
                <span key={idx} className="letter-highlight__compact-word">
                    {wordData.letters.map((letter, lidx) => (
                        <span
                            key={lidx}
                            className={letter.is_correct ? 'letter-highlight__letter--correct' : 'letter-highlight__letter--incorrect'}
                        >
                            {letter.letter}
                        </span>
                    ))}
                </span>
            ))}
        </div>
    );
}

export default LetterHighlight;
