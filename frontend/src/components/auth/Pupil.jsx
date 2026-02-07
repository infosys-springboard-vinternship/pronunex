/**
 * Pupil Component
 * Mouse-tracking pupil that follows cursor movement
 */

import { useState, useEffect, useRef } from 'react';

export function Pupil({
    size = 12,
    maxDistance = 5,
    pupilColor = '#2D2D2D',
    forceLookX,
    forceLookY
}) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const pupilRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const calculatePosition = () => {
        if (!pupilRef.current) return { x: 0, y: 0 };

        // Use forced look direction if provided
        if (forceLookX !== undefined && forceLookY !== undefined) {
            return { x: forceLookX, y: forceLookY };
        }

        const rect = pupilRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = mousePos.x - centerX;
        const deltaY = mousePos.y - centerY;
        const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

        const angle = Math.atan2(deltaY, deltaX);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        return { x, y };
    };

    const position = calculatePosition();

    return (
        <div
            ref={pupilRef}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: pupilColor,
                borderRadius: '50%',
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: 'transform 0.1s ease-out'
            }}
        />
    );
}

export default Pupil;
