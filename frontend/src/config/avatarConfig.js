// Avatar Configuration - Centralized avatar asset management
// All 11 predefined avatars for user profile selection

import avatar1 from '../assets/avatar/avatar-1.png';
import avatar2 from '../assets/avatar/avatar-2.jpeg';
import avatar3 from '../assets/avatar/avatar-3.png';
import avatar4 from '../assets/avatar/avatar-4.png';
import avatar5 from '../assets/avatar/avatar-5.png';
import avatar6 from '../assets/avatar/avatar-6.jpeg';
import avatar7 from '../assets/avatar/avatar-7.png';
import avatar8 from '../assets/avatar/avatar-8.png';
import avatar9 from '../assets/avatar/avatar-9.png';
import avatar10 from '../assets/avatar/avatar-10.png';
import avatar11 from '../assets/avatar/avatar-11.png';

// Avatar registry with id, source, and alt text
export const AVATARS = [
    { id: 'avatar-1', src: avatar1, alt: 'Avatar 1' },
    { id: 'avatar-2', src: avatar2, alt: 'Avatar 2' },
    { id: 'avatar-3', src: avatar3, alt: 'Avatar 3' },
    { id: 'avatar-4', src: avatar4, alt: 'Avatar 4' },
    { id: 'avatar-5', src: avatar5, alt: 'Avatar 5' },
    { id: 'avatar-6', src: avatar6, alt: 'Avatar 6' },
    { id: 'avatar-7', src: avatar7, alt: 'Avatar 7' },
    { id: 'avatar-8', src: avatar8, alt: 'Avatar 8' },
    { id: 'avatar-9', src: avatar9, alt: 'Avatar 9' },
    { id: 'avatar-10', src: avatar10, alt: 'Avatar 10' },
    { id: 'avatar-11', src: avatar11, alt: 'Avatar 11' },
];

// Default avatar ID
export const DEFAULT_AVATAR_ID = 'avatar-1';

// Helper function to get avatar by ID
export const getAvatarById = (id) => {
    return AVATARS.find(avatar => avatar.id === id) || AVATARS[0];
};
