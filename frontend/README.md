# Pronunex Frontend

React-based frontend for the Pronunex speech therapy platform, providing an intuitive interface for pronunciation practice, progress tracking, and personalized feedback.

## Features

- **User Authentication**: Secure login and registration with JWT
- **Practice Sessions**: Record and submit audio for pronunciation assessment
- **Real-time Feedback**: Instant pronunciation scores and improvement suggestions
- **Progress Dashboard**: Visual charts showing improvement over time
- **Phoneme Library**: Browse and learn about English phonemes
- **Adaptive Exercises**: Personalized practice sentences based on weak areas
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite 6
- **Routing**: React Router v7
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Fetch API
- **State Management**: React Context API

## Project Structure

```
frontend/
├── public/                  # Static assets
│   ├── icon.png            # App icon
│   └── pronunex.svg        # Logo
│
├── src/
│   ├── main.jsx            # Application entry point
│   ├── App.jsx             # Root component with routing
│   │
│   ├── components/         # Reusable UI components
│   │   ├── Navbar.jsx      # Navigation bar
│   │   ├── Toast.jsx       # Notification system
│   │   ├── Modal.jsx       # Reusable modal dialogs
│   │   ├── AvatarSelector.jsx  # Avatar selection
│   │   ├── EmptyState.jsx  # Empty state placeholder
│   │   ├── ErrorState.jsx  # Error display component
│   │   ├── Loader.jsx      # Loading spinner variants
│   │   └── ...
│   │
│   ├── pages/              # Page components
│   │   ├── LandingPage.jsx # Public landing page
│   │   ├── Login.jsx       # Authentication
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx   # Main dashboard
│   │   ├── Practice.jsx    # Practice session
│   │   ├── Progress.jsx    # Progress tracking
│   │   ├── Phonemes.jsx    # Phoneme library browser
│   │   ├── HowItWorks.jsx  # How it works guide
│   │   ├── SettingsPage.jsx # User settings
│   │   ├── Library.jsx     # Phoneme library
│   │   └── Profile.jsx     # User profile
│   │
│   ├── context/            # React context providers
│   │   └── AuthContext.jsx # Authentication state
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.js      # Authentication hook
│   │   ├── useToast.js     # Toast notifications
│   │   └── useApi.js       # API calls
│   │
│   ├── api/                # API client
│   │   └── client.js       # Axios/fetch wrapper
│   │
│   └── styles/             # Global styles
│       ├── index.css       # Tailwind imports
│       └── ...
│
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
├── eslint.config.js        # ESLint configuration
├── .prettierrc             # Prettier configuration
├── package.json            # Dependencies
└── .env.example            # Environment template
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` if needed:

```env
VITE_API_URL=http://localhost:8000
VITE_ENABLE_MOCKS=false
```

### 3. Start Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Available Scripts

### Development

```bash
npm run dev
```

Starts the Vite development server with hot module replacement.

### Build

```bash
npm run build
```

Builds the application for production to the `dist/` directory.

### Preview

```bash
npm run preview
```

Preview the production build locally.

### Lint

```bash
npm run lint
```

Run ESLint to check for code quality issues.

### Format

```bash
npm run format
```

Format code using Prettier.

```bash
npm run format:check
```

Check if code is formatted correctly without making changes.

## Key Components

### Authentication

**Login.jsx** / **Signup.jsx**: User authentication forms with validation

**AuthContext.jsx**: Global authentication state management

**useAuth.js**: Custom hook for accessing auth state and methods

### Practice Flow

**Practice.jsx**: Main practice interface with audio recording

**AssessmentResult.jsx**: Display pronunciation scores and feedback

**SentenceCard.jsx**: Show practice sentences with phoneme highlighting

### Progress Tracking

**Dashboard.jsx**: Overview of user statistics and recent activity

**Progress.jsx**: Detailed progress charts and phoneme-level analytics

**ProgressChart.jsx**: Reusable chart component using Recharts

### Library

**Phonemes.jsx**: Browse phonemes with search and filtering

**PhonemeCard.jsx**: Display phoneme details and articulation tips

## Routing

The application uses React Router v7 with the following routes:

- `/` - Landing page (public)
- `/login` - Login page (public)
- `/signup` - Signup page (public)
- `/dashboard` - Main dashboard (protected)
- `/practice` - Practice session (protected)
- `/progress` - Progress tracking (protected)
- `/phonemes` - Phoneme library (protected)
- `/profile` - User profile (protected)
- `/settings` - User settings (protected)
- `/how-it-works` - Feature guide (public)
- `/admin` - Admin dashboard (admin only)

Protected routes redirect to login if user is not authenticated.

## API Integration

The frontend communicates with the Django backend via REST APIs.

### API Client (`src/api/client.js`)

Centralized API client with:
- JWT token management
- Request/response interceptors
- Error handling
- Base URL configuration

### Example Usage

```javascript
import { apiClient } from './api/client';

// Get user profile
const profile = await apiClient.get('/api/v1/auth/profile/');

// Submit audio for assessment
const formData = new FormData();
formData.append('audio', audioBlob);
formData.append('sentence_id', sentenceId);

const result = await apiClient.post('/api/v1/practice/assess/', formData);
```

## Styling

### Tailwind CSS

The project uses Tailwind CSS 4 for styling with a custom configuration:

**Color Palette**:
- Primary: Emerald green (`#059669`)
- Background: Slate tones
- Accent: Teal shades

**Key Features**:
- Responsive design utilities
- Custom color scheme
- Glassmorphism effects
- Smooth animations

### Custom Styles

Global styles are defined in `src/styles/index.css`:
- CSS variables for theming
- Custom animations
- Utility classes

## State Management

The application uses React Context API for global state:

### AuthContext

Manages authentication state:
- User information
- JWT tokens
- Login/logout methods
- Token refresh

### Usage

```javascript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  // Use auth state and methods
}
```

## Audio Recording

The practice page uses the Web Audio API for recording:

1. Request microphone permission
2. Record user audio
3. Convert to WAV format
4. Submit to backend for assessment
5. Display results

## Development Guidelines

### Code Style

- Use functional components with hooks
- Follow ESLint and Prettier configurations
- Use meaningful variable names
- Add comments for complex logic
- Keep components small and focused

### Component Structure

```javascript
import React from 'react';

function MyComponent({ prop1, prop2 }) {
  // Hooks at the top
  const [state, setState] = useState();
  
  // Event handlers
  const handleClick = () => {
    // ...
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default MyComponent;
```

### File Naming

- Components: PascalCase (e.g., `MyComponent.jsx`)
- Utilities: camelCase (e.g., `apiClient.js`)
- Styles: kebab-case (e.g., `custom-styles.css`)

## Troubleshooting

### Development Server Issues

If the dev server fails to start:
1. Delete `node_modules/` and `package-lock.json`
2. Run `npm install` again
3. Check for port conflicts (default: 5173)

### API Connection Issues

- Verify backend is running on the correct port
- Check `VITE_API_URL` in `.env`
- Verify CORS configuration in backend
- Check browser console for errors

### Build Issues

- Clear Vite cache: `rm -rf node_modules/.vite`
- Check for TypeScript errors (if using TS)
- Verify all imports are correct

## Performance Optimization

- Use React.memo for expensive components
- Implement lazy loading for routes
- Optimize images and assets
- Use production build for deployment
- Enable gzip compression on server

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Deployment

### Build for Production

```bash
npm run build
```

The `dist/` directory will contain the production build.

### Environment Variables

Set production environment variables:

```env
VITE_API_URL=https://api.yourdomain.co or Backend URL
VITE_ENABLE_MOCKS=false
```

### Hosting Options

- **Vercel**: Zero-config deployment
- **Netlify**: Automatic builds from Git

## Testing

Currently, the project uses manual testing. Future improvements:

- Add Jest for unit tests
- Add React Testing Library for component tests
- Add Cypress for E2E tests

## License

MIT License - see root LICENSE file

## Support

For issues, please use the GitHub issue tracker.
