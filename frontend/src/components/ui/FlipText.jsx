/**
 * FlipText Component
 * 3D flip text animation with character-by-character staggered effect
 */

import React, { useMemo } from "react";
import "./FlipText.css";

/**
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes for the wrapper
 * @param {string} props.children - The text content to animate
 * @param {number} props.duration - Duration of the flip animation in seconds (default: 2.2)
 * @param {number} props.delay - Initial delay before animation starts in seconds (default: 0)
 * @param {boolean} props.loop - Whether the animation should loop infinitely (default: true)
 * @param {string} props.separator - Custom separator for splitting text (default: " ")
 */
export function FlipText({
    className = "",
    children,
    duration = 2.2,
    delay = 0,
    loop = true,
    separator = " ",
}) {
    const words = useMemo(() => children.split(separator), [children, separator]);
    const totalChars = children.length;

    // Calculate character index for each position
    const getCharIndex = (wordIndex, charIndex) => {
        let index = 0;
        for (let i = 0; i < wordIndex; i++) {
            index += words[i].length + (separator === " " ? 1 : separator.length);
        }
        return index + charIndex;
    };

    return (
        <span
            className={`flip-text-wrapper ${className}`}
            style={{ perspective: "1000px" }}
        >
            {words.map((word, wordIndex) => {
                const chars = word.split("");

                return (
                    <span
                        key={wordIndex}
                        className="flip-word"
                        style={{ transformStyle: "preserve-3d" }}
                    >
                        {chars.map((char, charIndex) => {
                            const currentGlobalIndex = getCharIndex(wordIndex, charIndex);

                            // Calculate delay based on character position using sine wave
                            const normalizedIndex = currentGlobalIndex / totalChars;
                            const sineValue = Math.sin(normalizedIndex * (Math.PI / 2));
                            const calculatedDelay = sineValue * (duration * 0.25) + delay;

                            return (
                                <span
                                    key={charIndex}
                                    className="flip-char"
                                    data-char={char}
                                    style={{
                                        "--flip-duration": `${duration}s`,
                                        "--flip-delay": `${calculatedDelay}s`,
                                        "--flip-iteration": loop ? "infinite" : "1",
                                        transformStyle: "preserve-3d",
                                    }}
                                >
                                    {char}
                                </span>
                            );
                        })}
                        {separator === " " && wordIndex < words.length - 1 && (
                            <span className="flip-whitespace">&nbsp;</span>
                        )}
                        {separator !== " " && wordIndex < words.length - 1 && (
                            <span className="flip-separator">{separator}</span>
                        )}
                    </span>
                );
            })}
        </span>
    );
}

export default FlipText;
