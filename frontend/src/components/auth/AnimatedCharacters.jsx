/**
 * AnimatedCharacters Component
 * 4 cartoon characters with interactive animations for auth pages
 * 
 * Features:
 * - Mouse tracking for eyes and body lean
 * - Random blinking intervals
 * - Characters look at each other when typing
 * - React to password visibility
 */

import { useState, useEffect, useRef } from 'react';
import { EyeBall } from './EyeBall';
import { Pupil } from './Pupil';
import { CHARACTER_CONFIG, ANIMATION_CONFIG, CONTAINER_CONFIG } from './characterConfig';

export function AnimatedCharacters({
    isTyping = false,
    passwordLength = 0,
    showPassword = false,
    confirmPasswordLength = 0,
    showConfirmPassword = false
}) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
    const [isBlackBlinking, setIsBlackBlinking] = useState(false);
    const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
    const [isPurplePeeking, setIsPurplePeeking] = useState(false);

    const purpleRef = useRef(null);
    const blackRef = useRef(null);
    const yellowRef = useRef(null);
    const orangeRef = useRef(null);

    const config = CHARACTER_CONFIG;
    const anim = ANIMATION_CONFIG;

    // Check if password is visible
    const isPasswordVisible = (passwordLength > 0 && showPassword) ||
        (confirmPasswordLength > 0 && showConfirmPassword);
    const isPasswordHidden = (passwordLength > 0 && !showPassword) ||
        (confirmPasswordLength > 0 && !showConfirmPassword);

    // Mouse tracking
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Purple character blinking
    useEffect(() => {
        const getRandomInterval = () =>
            Math.random() * (anim.blinkIntervalMax - anim.blinkIntervalMin) + anim.blinkIntervalMin;

        const scheduleBlink = () => {
            const timeout = setTimeout(() => {
                setIsPurpleBlinking(true);
                setTimeout(() => {
                    setIsPurpleBlinking(false);
                    scheduleBlink();
                }, anim.blinkDuration);
            }, getRandomInterval());
            return timeout;
        };

        const timeout = scheduleBlink();
        return () => clearTimeout(timeout);
    }, []);

    // Black character blinking
    useEffect(() => {
        const getRandomInterval = () =>
            Math.random() * (anim.blinkIntervalMax - anim.blinkIntervalMin) + anim.blinkIntervalMin;

        const scheduleBlink = () => {
            const timeout = setTimeout(() => {
                setIsBlackBlinking(true);
                setTimeout(() => {
                    setIsBlackBlinking(false);
                    scheduleBlink();
                }, anim.blinkDuration);
            }, getRandomInterval());
            return timeout;
        };

        const timeout = scheduleBlink();
        return () => clearTimeout(timeout);
    }, []);

    // Look at each other when typing
    useEffect(() => {
        if (isTyping) {
            setIsLookingAtEachOther(true);
            const timer = setTimeout(() => {
                setIsLookingAtEachOther(false);
            }, anim.lookAtEachOtherDuration);
            return () => clearTimeout(timer);
        } else {
            setIsLookingAtEachOther(false);
        }
    }, [isTyping]);

    // Purple peeking when password is visible
    useEffect(() => {
        if (isPasswordVisible) {
            const schedulePeek = () => {
                const timeout = setTimeout(() => {
                    setIsPurplePeeking(true);
                    setTimeout(() => {
                        setIsPurplePeeking(false);
                    }, anim.peekDuration);
                }, Math.random() * (anim.peekIntervalMax - anim.peekIntervalMin) + anim.peekIntervalMin);
                return timeout;
            };
            const timeout = schedulePeek();
            return () => clearTimeout(timeout);
        } else {
            setIsPurplePeeking(false);
        }
    }, [isPasswordVisible, isPurplePeeking]);

    // Calculate position and lean based on mouse
    const calculatePosition = (ref) => {
        if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 3;

        const deltaX = mousePos.x - centerX;
        const deltaY = mousePos.y - centerY;

        const faceX = Math.max(-15, Math.min(15, deltaX / 20));
        const faceY = Math.max(-10, Math.min(10, deltaY / 30));
        const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

        return { faceX, faceY, bodySkew };
    };

    const purplePos = calculatePosition(purpleRef);
    const blackPos = calculatePosition(blackRef);
    const yellowPos = calculatePosition(yellowRef);
    const orangePos = calculatePosition(orangeRef);

    const transitionStyle = `all ${anim.transitionDuration} ${anim.transitionEasing}`;

    return (
        <div
            className="animated-characters-container"
            style={{
                position: 'relative',
                width: `${CONTAINER_CONFIG.width}px`,
                height: `${CONTAINER_CONFIG.height}px`
            }}
        >
            {/* Purple Character - Back layer */}
            <div
                ref={purpleRef}
                className="character character--purple"
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: `${config.purple.position.left}px`,
                    width: `${config.purple.width}px`,
                    height: (isTyping || isPasswordHidden) ? `${config.purple.heightTyping}px` : `${config.purple.height}px`,
                    backgroundColor: config.purple.color,
                    borderRadius: config.purple.borderRadius,
                    zIndex: 1,
                    transition: transitionStyle,
                    transform: isPasswordVisible
                        ? 'skewX(0deg)'
                        : (isTyping || isPasswordHidden)
                            ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                            : `skewX(${purplePos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center'
                }}
            >
                {/* Eyes */}
                <div
                    style={{
                        position: 'absolute',
                        display: 'flex',
                        gap: `${config.purple.eyeGap}px`,
                        left: isPasswordVisible ? '20px' : isLookingAtEachOther ? '55px' : `${45 + purplePos.faceX}px`,
                        top: isPasswordVisible ? '35px' : isLookingAtEachOther ? '65px' : `${40 + purplePos.faceY}px`,
                        transition: transitionStyle
                    }}
                >
                    <EyeBall
                        size={config.purple.eyeSize}
                        pupilSize={config.purple.pupilSize}
                        maxDistance={5}
                        eyeColor={config.purple.eyeColor}
                        pupilColor={config.purple.pupilColor}
                        isBlinking={isPurpleBlinking}
                        forceLookX={isPasswordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                        forceLookY={isPasswordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                    />
                    <EyeBall
                        size={config.purple.eyeSize}
                        pupilSize={config.purple.pupilSize}
                        maxDistance={5}
                        eyeColor={config.purple.eyeColor}
                        pupilColor={config.purple.pupilColor}
                        isBlinking={isPurpleBlinking}
                        forceLookX={isPasswordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                        forceLookY={isPasswordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                    />
                </div>
            </div>

            {/* Black Character - Middle layer */}
            <div
                ref={blackRef}
                className="character character--black"
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: `${config.black.position.left}px`,
                    width: `${config.black.width}px`,
                    height: `${config.black.height}px`,
                    backgroundColor: config.black.color,
                    borderRadius: config.black.borderRadius,
                    zIndex: 2,
                    transition: transitionStyle,
                    transform: isPasswordVisible
                        ? 'skewX(0deg)'
                        : isLookingAtEachOther
                            ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                            : (isTyping || isPasswordHidden)
                                ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                                : `skewX(${blackPos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center'
                }}
            >
                {/* Eyes */}
                <div
                    style={{
                        position: 'absolute',
                        display: 'flex',
                        gap: `${config.black.eyeGap}px`,
                        left: isPasswordVisible ? '10px' : isLookingAtEachOther ? '32px' : `${26 + blackPos.faceX}px`,
                        top: isPasswordVisible ? '28px' : isLookingAtEachOther ? '12px' : `${32 + blackPos.faceY}px`,
                        transition: transitionStyle
                    }}
                >
                    <EyeBall
                        size={config.black.eyeSize}
                        pupilSize={config.black.pupilSize}
                        maxDistance={4}
                        eyeColor={config.black.eyeColor}
                        pupilColor={config.black.pupilColor}
                        isBlinking={isBlackBlinking}
                        forceLookX={isPasswordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
                        forceLookY={isPasswordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
                    />
                    <EyeBall
                        size={config.black.eyeSize}
                        pupilSize={config.black.pupilSize}
                        maxDistance={4}
                        eyeColor={config.black.eyeColor}
                        pupilColor={config.black.pupilColor}
                        isBlinking={isBlackBlinking}
                        forceLookX={isPasswordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
                        forceLookY={isPasswordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
                    />
                </div>
            </div>

            {/* Orange Character - Front left */}
            <div
                ref={orangeRef}
                className="character character--orange"
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: `${config.orange.position.left}px`,
                    width: `${config.orange.width}px`,
                    height: `${config.orange.height}px`,
                    backgroundColor: config.orange.color,
                    borderRadius: config.orange.borderRadius,
                    zIndex: 3,
                    transition: transitionStyle,
                    transform: isPasswordVisible ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center'
                }}
            >
                {/* Eyes - Pupils only */}
                <div
                    style={{
                        position: 'absolute',
                        display: 'flex',
                        gap: `${config.orange.eyeGap}px`,
                        left: isPasswordVisible ? '50px' : `${82 + (orangePos.faceX || 0)}px`,
                        top: isPasswordVisible ? '85px' : `${90 + (orangePos.faceY || 0)}px`,
                        transition: 'all 0.2s ease-out'
                    }}
                >
                    <Pupil
                        size={config.orange.pupilSize}
                        maxDistance={5}
                        pupilColor={config.orange.pupilColor}
                        forceLookX={isPasswordVisible ? -5 : undefined}
                        forceLookY={isPasswordVisible ? -4 : undefined}
                    />
                    <Pupil
                        size={config.orange.pupilSize}
                        maxDistance={5}
                        pupilColor={config.orange.pupilColor}
                        forceLookX={isPasswordVisible ? -5 : undefined}
                        forceLookY={isPasswordVisible ? -4 : undefined}
                    />
                </div>
            </div>

            {/* Yellow Character - Front right */}
            <div
                ref={yellowRef}
                className="character character--yellow"
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: `${config.yellow.position.left}px`,
                    width: `${config.yellow.width}px`,
                    height: `${config.yellow.height}px`,
                    backgroundColor: config.yellow.color,
                    borderRadius: config.yellow.borderRadius,
                    zIndex: 4,
                    transition: transitionStyle,
                    transform: isPasswordVisible ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center'
                }}
            >
                {/* Eyes - Pupils only */}
                <div
                    style={{
                        position: 'absolute',
                        display: 'flex',
                        gap: `${config.yellow.eyeGap}px`,
                        left: isPasswordVisible ? '20px' : `${52 + (yellowPos.faceX || 0)}px`,
                        top: isPasswordVisible ? '35px' : `${40 + (yellowPos.faceY || 0)}px`,
                        transition: 'all 0.2s ease-out'
                    }}
                >
                    <Pupil
                        size={config.yellow.pupilSize}
                        maxDistance={5}
                        pupilColor={config.yellow.pupilColor}
                        forceLookX={isPasswordVisible ? -5 : undefined}
                        forceLookY={isPasswordVisible ? -4 : undefined}
                    />
                    <Pupil
                        size={config.yellow.pupilSize}
                        maxDistance={5}
                        pupilColor={config.yellow.pupilColor}
                        forceLookX={isPasswordVisible ? -5 : undefined}
                        forceLookY={isPasswordVisible ? -4 : undefined}
                    />
                </div>
                {/* Mouth */}
                <div
                    style={{
                        position: 'absolute',
                        width: `${config.yellow.mouthWidth}px`,
                        height: `${config.yellow.mouthHeight}px`,
                        backgroundColor: config.yellow.pupilColor,
                        borderRadius: '9999px',
                        left: isPasswordVisible ? '10px' : `${40 + (yellowPos.faceX || 0)}px`,
                        top: isPasswordVisible ? '88px' : `${88 + (yellowPos.faceY || 0)}px`,
                        transition: 'all 0.2s ease-out'
                    }}
                />
            </div>
        </div>
    );
}

export default AnimatedCharacters;
