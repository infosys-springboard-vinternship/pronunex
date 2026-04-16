# Frontend (React) Deep Dive

## 1. Application Entry Point

### `main.jsx` — The Root
```jsx
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <UIProvider>          {/* Toast notifications, sidebar state */}
                <SettingsProvider>     {/* Theme, font scale, colors */}
                    <AuthProvider>         {/* User auth state, JWT tokens */}
                        <App />
                    </AuthProvider>
                </SettingsProvider>
            </UIProvider>
        </BrowserRouter>
    </StrictMode>
);
```

**Q: Why is the nesting order important?**
"Outer providers can be used by inner ones. `SettingsProvider` needs to be outside `AuthProvider` because auth-related components need access to theme settings. `BrowserRouter` is outermost because all providers and components need routing context."

**Q: What does StrictMode do?**
"It's a React development tool that:
1. Renders components twice to detect impure renders
2. Re-runs effects to detect missing cleanup
3. Warns about deprecated API usage
It causes `useEffect` to fire twice in development only, which is why we have request deduplication in `useDashboard`."

---

## 2. Context Providers (State Management)

### Why NOT Redux?
"Redux is overkill for this project. We have three isolated state domains (auth, settings, UI) that rarely interact. React Context + useState handles this perfectly with much less boilerplate. Redux would add ~5 extra files per state slice."

### AuthContext (`context/AuthContext.jsx`)
```jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // On mount: check sessionStorage for existing tokens
    useEffect(() => {
        const tokens = getStoredTokens();
        if (tokens?.access) {
            api.setTokens(tokens);
            fetchProfile();  // Validate token by fetching user profile
        } else {
            setLoading(false);
        }
    }, []);
    
    const login = async (email, password) => {
        const response = await api.post(ENDPOINTS.AUTH.LOGIN, { email, password });
        const { access, refresh, user: userData } = response.data;
        
        sessionStorage.setItem('access_token', access);
        sessionStorage.setItem('refresh_token', refresh);
        api.setTokens({ access, refresh });
        setUser(userData);
    };
    
    const logout = async () => {
        await api.post(ENDPOINTS.AUTH.LOGOUT, {
            refresh: sessionStorage.getItem('refresh_token')
        });
        sessionStorage.clear();
        api.clearTokens();
        setUser(null);
    };
}
```

**Q: Why check token on mount?**
"To persist login across page refreshes. When the app loads, we check sessionStorage for saved tokens. If found, we validate them by fetching the user profile. If the token is expired, the API client auto-refreshes it."

**Q: What's the `loading` state for?**
"To prevent a flash of the login page on refresh. Without it, the app would briefly show the login page while checking if the user is already authenticated, then redirect to the dashboard. With `loading=true`, we show nothing until auth check completes."

### SettingsContext (`context/SettingsContext.jsx`)
```jsx
export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(() => {
        // Initialize from localStorage (persisted across sessions)
        const stored = localStorage.getItem('pronunex_settings_v1');
        return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem('pronunex_settings_v1', JSON.stringify(settings));
        applySettingsToDOM(settings);  // Apply CSS variables to document root
    }, [settings]);

    const applySettingsToDOM = (currentSettings) => {
        document.documentElement.setAttribute('data-theme', currentSettings.theme);
        
        // Font scale: 100% = 16px base
        root.style.fontSize = `${16 * (currentSettings.fontScale / 100)}px`;
        
        // Map color preset shades to CSS variables
        Object.entries(preset.shades).forEach(([shade, value]) => {
            root.style.setProperty(`--color-primary-${shade}`, value);
        });
    };
}
```

**Q: Why localStorage for settings but sessionStorage for tokens?**
"Settings should persist across browser sessions (user's theme preference shouldn't reset every time they close the tab). But auth tokens should be cleared when the tab is closed for security."

**Q: How does theming work?**
"When the user changes the primary color, the `applySettingsToDOM` function updates CSS custom properties on `document.documentElement`. Every component that uses `var(--color-primary-500)` automatically updates. No component re-render needed — it's pure CSS."

---

## 3. Routing & Protected Routes

### `App.jsx`
```jsx
function App() {
    const { user, loading } = useAuth();
    
    if (loading) return <LoadingScreen />;
    
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes — require authentication */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/practice" element={
                        <Suspense fallback={<LoadingFallback />}>
                            <Practice />  {/* Lazy loaded */}
                        </Suspense>
                    } />
                    <Route path="/progress" element={<Progress />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>
            </Route>
        </Routes>
    );
}
```

### ProtectedRoute Component
```jsx
function ProtectedRoute() {
    const { user, loading } = useAuth();
    
    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;
    
    return <Outlet />;  // Renders nested child routes
}
```

**Q: What is `<Outlet />`?**
"It's React Router's placeholder for nested routes. When `ProtectedRoute` renders `<Outlet />`, it gets replaced by the matched child route (Dashboard, Practice, etc.). This pattern lets us wrap multiple routes with the same auth check."

**Q: What is lazy loading?**
```jsx
const Practice = lazy(() => import('./pages/Practice'));
```
"Instead of including the Practice page in the initial JavaScript bundle, `lazy()` splits it into a separate chunk that's only downloaded when the user navigates to `/practice`. This makes the initial page load faster. We wrap it in `<Suspense>` to show a loading fallback while the chunk downloads."

**Q: Why lazy load Practice specifically?**
"The Practice page is the heaviest component — it includes audio recording, waveform visualization, results display, and complex state management. It might include 50KB+ of JavaScript. Users who visit only the dashboard shouldn't pay that cost."

---

## 4. API Client (`api/client.js`)

```javascript
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.accessToken = null;
        this.refreshToken = null;
        this._refreshPromise = null;  // Deduplication of refresh attempts
    }

    async request(method, endpoint, data, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = {
            ...options.headers,
        };
        
        // Inject JWT token
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        // Don't set Content-Type for FormData (browser sets it with boundary)
        if (!(data instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(url, {
            method,
            headers,
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
        
        // Handle 401 - Automatic token refresh
        if (response.status === 401 && !options._isRetry) {
            const refreshed = await this._refreshToken();
            if (refreshed) {
                return this.request(method, endpoint, data, {
                    ...options,
                    _isRetry: true  // Prevent infinite loop
                });
            }
        }
        
        // Parse response
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new ApiError(
                responseData.error || 'Request failed',
                response.status,
                responseData
            );
        }
        
        return { data: responseData, status: response.status };
    }
}
```

**Q: Why use `fetch` instead of Axios?**
"Native browser API — zero dependencies. Axios adds ~15KB to the bundle and provides features we don't need. Our `ApiClient` wrapper provides the same convenience (token injection, error handling, retry) in ~200 lines."

**Q: What does `_isRetry` prevent?**
"Infinite retry loops. If the refreshed token is ALSO expired (unlikely but possible), the second 401 would trigger another refresh, which triggers another request, etc. With `_isRetry: true`, the second 401 immediately fails instead of retrying."

**Q: Why not set Content-Type for FormData?**
"When sending `multipart/form-data` (file uploads), the browser needs to set the Content-Type header automatically because it includes a `boundary` string that separates the form fields. If we manually set `Content-Type: multipart/form-data`, the boundary is missing and the server can't parse the upload."

**Q: How does token refresh deduplication work?**
```javascript
async _refreshToken() {
    // If a refresh is already in progress, wait for it
    if (this._refreshPromise) {
        return this._refreshPromise;
    }
    
    this._refreshPromise = this._doRefresh();
    const result = await this._refreshPromise;
    this._refreshPromise = null;
    return result;
}
```
"If multiple API calls fail with 401 simultaneously (e.g., dashboard loads 3 endpoints), all three would try to refresh the token. With `_refreshPromise`, only the first one actually calls the refresh endpoint. The other two wait for the same promise."

---

## 5. Custom Hooks

### `useAudio` Hook (Audio Recording)
```javascript
export function useAudio({ maxDuration = 30, onRecordingComplete } = {}) {
    const [state, setState] = useState(AUDIO_STATES.IDLE);
    const [audioBlob, setAudioBlob] = useState(null);
    const [duration, setDuration] = useState(0);
    
    const mediaRecorderRef = useRef(null);    // MediaRecorder instance
    const streamRef = useRef(null);           // MediaStream (microphone)
    const chunksRef = useRef([]);             // Audio data chunks
    const timerRef = useRef(null);            // Interval timer
```

**Q: Why `useRef` instead of `useState` for mediaRecorder?**
"Because we don't want component re-renders when the MediaRecorder reference changes. `useRef` stores a mutable value that persists across renders without causing re-renders. The MediaRecorder, stream, and chunks are implementation details that don't affect the UI."

**Q: What's the state machine?**
```
IDLE ──→ REQUESTING (mic permission) ──→ RECORDING ──→ PROCESSING ──→ IDLE (with blob)
  │              │                                          ↑
  │              ▼                                          │
  │           DENIED                                     ERROR
  │              │
  └──────────────┘ (retry)
```

**Q: What is cleanup?**
```javascript
const cleanup = useCallback(() => {
    clearInterval(timerRef.current);                    // Stop timer
    streamRef.current?.getTracks().forEach(t => t.stop()); // Release microphone
    URL.revokeObjectURL(audioUrl);                     // Free memory
    mediaRecorderRef.current = null;
    chunksRef.current = [];
}, [audioUrl]);
```
"Three critical cleanups:
1. **Stop timer** — prevent memory leaks from running intervals
2. **Release microphone** — the recording indicator in the browser disappears
3. **Revoke URL** — `URL.createObjectURL` creates a memory reference; if not revoked, it leaks"

### `useDashboard` Hook (Shared Data)
```javascript
// Module-level cache — shared across ALL component instances
let _cache = { data: null, promise: null, timestamp: 0, endpoint: null };
const STALE_MS = 5 * 60 * 1000; // 5 minutes

export function useDashboard({ days = 30, enabled = true } = {}) {
    const [data, setData] = useState(_cache.data);
    
    const fetch = useCallback(async (force = false) => {
        // 1. Return cached data if still fresh
        if (!force && _cache.data && Date.now() - _cache.timestamp < STALE_MS) {
            setData(_cache.data);
            return _cache.data;
        }
        
        // 2. Piggyback on in-flight request
        if (_cache.promise && !force) {
            return await _cache.promise;
        }
        
        // 3. Fire actual API call
        const fetchPromise = api.get(endpoint).then(res => res.data);
        _cache.promise = fetchPromise;
        
        const result = await fetchPromise;
        _cache.data = result;
        _cache.timestamp = Date.now();
        _cache.promise = null;
        
        return result;
    }, [endpoint, enabled]);
}
```

**Q: Why module-level cache instead of state?**
"React state is per-component-instance. If two components both call `useDashboard()`, they'd each have their own cache, making separate API calls. A module-level variable is shared across ALL instances — only one API call fires, and both components get the same data."

---

## 6. Key JavaScript Concepts Used

### Closures
```javascript
const startRecording = useCallback(async () => {
    mediaRecorder.ondataavailable = (event) => {
        // This callback CLOSES OVER chunksRef from the outer scope
        chunksRef.current.push(event.data);
    };
}, []);
```
"A closure is when a function 'remembers' variables from its outer scope even after the outer function has returned. The `ondataavailable` callback captures `chunksRef` from `useCallback`'s scope."

### Promises and Async/Await
```javascript
const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login/', { email, password });
        // await pauses execution until the API call resolves
        setUser(response.data.user);
    } catch (error) {
        // If the API call rejects (network error, 400, 500)
        setError(error.message);
    }
};
```
"Async/await is syntactic sugar over Promises. `await` pauses the function until the Promise resolves. It makes asynchronous code look synchronous and easier to read than `.then()` chains."

### Destructuring
```javascript
const { user, loading, login, logout } = useAuth();
// Instead of:
// const auth = useAuth();
// const user = auth.user;
// const loading = auth.loading;
```

### Spread Operator
```javascript
const [settings, setSettings] = useState(() => {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    // Merges stored settings ON TOP of defaults
    // If stored has theme='dark', it overrides DEFAULT theme='light'
    // Missing keys fall back to defaults
});
```

### Optional Chaining
```javascript
const email = user?.email;        // undefined if user is null (no crash)
const score = result?.data?.score; // safe traversal through nested objects
```

### Conditional Rendering
```jsx
{user?.is_staff && <AdminPanel />}      // Only render for admins
{isLoading ? <Spinner /> : <Content />}  // Ternary for two states
{error && <ErrorBanner message={error} />}  // Short-circuit for conditionals
```

### Array Methods
```javascript
// .map — transform each item
const items = sentences.map(s => <SentenceCard key={s.id} sentence={s} />);

// .filter — select matching items
const weakPhonemes = phonemeScores.filter(ps => ps.score < 0.7);

// .reduce — accumulate into single value
const totalScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

// .some / .every — boolean checks
const hasWeakScores = scores.some(s => s.score < 0.5);
const allPerfect = scores.every(s => s.score >= 0.9);
```
