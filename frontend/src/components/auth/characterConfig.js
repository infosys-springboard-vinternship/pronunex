/**
 * Character Configuration
 * Centralized color and size control for animated auth characters
 * 
 * USAGE: Modify these values to customize character appearance
 */

export const CHARACTER_CONFIG = {
    // Purple tall rectangle character
    purple: {
        color: '#6C3FF5',
        width: 180,
        height: 400,
        heightTyping: 440,
        borderRadius: '10px 10px 0 0',
        eyeColor: 'white',
        pupilColor: '#2D2D2D',
        eyeSize: 18,
        pupilSize: 7,
        eyeGap: 32,
        position: { left: 70 }
    },

    // Black tall rectangle character
    black: {
        color: '#2D2D2D',
        width: 120,
        height: 310,
        borderRadius: '8px 8px 0 0',
        eyeColor: 'white',
        pupilColor: '#2D2D2D',
        eyeSize: 16,
        pupilSize: 6,
        eyeGap: 24,
        position: { left: 240 }
    },

    // Orange semi-circle character
    orange: {
        color: '#FF9B6B',
        width: 240,
        height: 200,
        borderRadius: '120px 120px 0 0',
        pupilColor: '#2D2D2D',
        pupilSize: 12,
        eyeGap: 32,
        position: { left: 0 }
    },

    // Yellow rounded rectangle character
    yellow: {
        color: '#E8D754',
        width: 140,
        height: 230,
        borderRadius: '70px 70px 0 0',
        pupilColor: '#2D2D2D',
        pupilSize: 12,
        eyeGap: 24,
        mouthWidth: 80,
        mouthHeight: 4,
        position: { left: 310 }
    }
};

// Animation timing configuration
export const ANIMATION_CONFIG = {
    blinkIntervalMin: 3000,  // Minimum time between blinks (ms)
    blinkIntervalMax: 7000,  // Maximum time between blinks (ms)
    blinkDuration: 150,      // Duration of blink (ms)
    peekDuration: 800,       // Duration of peeking animation (ms)
    peekIntervalMin: 2000,   // Minimum time between peeks (ms)
    peekIntervalMax: 5000,   // Maximum time between peeks (ms)
    lookAtEachOtherDuration: 800,  // How long characters look at each other (ms)
    transitionDuration: '700ms',
    transitionEasing: 'ease-in-out'
};

// Container dimensions
export const CONTAINER_CONFIG = {
    width: 550,
    height: 400
};
