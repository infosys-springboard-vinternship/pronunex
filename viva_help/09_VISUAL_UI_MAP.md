# VISUAL UI MAP — "Where Is The Code For This?"

> **How to use this guide:** When the mentor points at something on screen and asks "where is the code for this?", find the page/section below and give the **File** and **Line** reference. Then explain the **How It Works** in simple terms.

---

## STRATEGY: How To Answer These Questions

**Step 1:** Identify WHICH PAGE they're looking at (Landing, Dashboard, Practice, etc.)
**Step 2:** Identify WHAT element they're pointing at (animation, text, card, chart, etc.)
**Step 3:** Use this guide to find the exact file
**Step 4:** Say: "That's in `[FileName.jsx]`, around line [X]. It works by [simple explanation]."

---

## PAGE 1: LANDING PAGE (`/`)

### What You See → Where The Code Is

| What The Mentor Points At | File (JSX) | File (CSS) | How It Works |
|---|---|---|---|
| **The entire landing page** | `pages/LandingPage.jsx` | `pages/LandingPage.css` | Wraps all sections with `framer-motion` AnimatePresence for page-level animation |
| **Green progress bar at top of page** | `components/ui/ScrollProgress.jsx` | `components/ui/ScrollProgress.css` | Uses `framer-motion`'s `useScroll()` hook to track scroll position. `scaleX` transforms a fixed bar from 0% to 100% width as you scroll. Spring physics make it smooth. |
| **"AI-Driven Precision" flipping text** | `components/ui/FlipText.jsx` | `components/ui/FlipText.css` | Splits text into individual characters (<span>). Each character has a CSS `@keyframes` flip animation with staggered delays calculated via a sine wave function. Characters flip one by one creating a wave effect. |
| **Small green floating dots in background** | `components/ui/FloatingParticles.jsx` | `components/ui/FloatingParticles.css` | Creates 25 small `<div>` elements with random positions, sizes (2-6px), and opacity. Each particle uses `framer-motion` `animate` to move up/down/left/right in an infinite loop with random duration (15-35s). |
| **Green glowing blobs behind hero** | `components/landing/HeroSection.jsx` (L99-126) | `components/landing/HeroSection.css` | Three `<div>` elements with large border-radius, blurred with `filter: blur()`, colored green/teal. They have parallax: `useTransform(scrollY, [0,500], [0,-150])` moves them at different speeds when scrolling. |
| **"Start Your First Assessment" shiny button** | `components/ui/AnimatedButton.jsx` | `components/ui/AnimatedButton.css` | Two layers: (1) A CSS mask-image gradient that sweeps across the text creating a shine reveal effect, animated with `framer-motion` `--mask-x` from 100% to -100%. (2) A background-position animation on the border creating a moving shine. Both repeat infinitely every 3 seconds. |
| **"44+" counter that counts up** | `components/ui/AnimatedCounter.jsx` | — (inline) | Uses `useInView` (framer-motion) to detect when visible. On first view, uses `requestAnimationFrame` loop with an `easeOutQuart` easing function to count from 0 to target number over 2 seconds. |
| **3D glass card mockup** | `components/landing/HeroSection.jsx` (L194-265) | `components/landing/HeroSection.css` | A card with `perspective: 1000px` and `transform-style: preserve-3d`. Mouse position is tracked via `useMousePosition` custom hook. `useSpring` converts mouse X/Y into smooth `rotateX`/`rotateY` values. Moving mouse tilts the card in 3D. |
| **Red/Yellow/Green dots on mockup** | `components/landing/HeroSection.jsx` (L211-215) | `components/landing/HeroSection.css` | Three `<span>` elements styled as 12px circles with macOS-style colors. Pure CSS — no animation. |
| **85% score ring on mockup** | `components/landing/HeroSection.jsx` (L236-247) | `components/landing/HeroSection.css` | SVG `<path>` with `stroke-dasharray="85, 100"`. This draws 85% of the circle arc. The arc formula uses `a 15.9155 15.9155 0 0 1 0 31.831` — a standard SVG arc trick for circular progress. |
| **Floating "Phoneme Detected" card** | `components/landing/HeroSection.jsx` (L267-277) | `components/landing/HeroSection.css` | A small card with `framer-motion` variants: starts `scale: 0.8, opacity: 0`, animates to `scale: 1, opacity: 1` with a 0.8s delay after page load. |
| **Feature cards grid** (below hero) | `components/landing/FeatureGridSection.jsx` | `components/landing/FeatureGridSection.css` | Lazy-loaded section. CSS Grid with `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`. Cards have hover lift effect from `animations.css`. |
| **"Data in Action" statistics** | `components/landing/DataInActionSection.jsx` | `components/landing/DataInActionSection.css` | Lazy-loaded. Contains animated counters and stat cards. |
| **"Technical Trust" section** | `components/landing/TechnicalTrustSection.jsx` | `components/landing/TechnicalTrustSection.css` | Lists tech stack badges with icons. |
| **"Get Started Now" CTA** | `components/landing/CTASection.jsx` | `components/landing/CTASection.css` | Full-width section with gradient background and AnimatedButton. |
| **Footer** | `components/landing/Footer.jsx` | `components/landing/Footer.css` | Three-column layout: Brand + Logo, Quick Links (react-router Links), Social icons (GitHub, LinkedIn from `lucide-react`). |
| **Skeleton loading while sections load** | `components/landing/SectionSkeleton.jsx` | `components/landing/SectionSkeleton.css` | Shows shimmer animation placeholder while lazy sections download. Uses `@keyframes shimmer` from `animations.css`. |

---

## PAGE 2: LOGIN & SIGNUP (`/login`, `/signup`)

| What The Mentor Points At | File | CSS File | How It Works |
|---|---|---|---|
| **Login form** | `pages/Login.jsx` | `pages/Auth.css` | Controlled inputs with `useState`. `onSubmit` calls `api.post(ENDPOINTS.AUTH.LOGIN)`. Form validation shows inline errors. |
| **Signup form** | `pages/Signup.jsx` | `pages/Auth.css` | Same pattern. Extra fields: full_name, username. Password strength indicator. |
| **"Forgot Password" link** | `pages/ForgotPassword.jsx` | `pages/Auth.css` | Sends email to `/auth/password/reset/`. Always shows success message (security). |
| **Password visibility toggle** | `pages/Login.jsx` | `pages/Auth.css` | `useState` toggles input `type` between `"password"` and `"text"`. Eye icon from `lucide-react`. |
| **Form error shake** | — | `styles/animations.css` (L169-190) | `@keyframes shake` — translateX alternates between -4px and 4px for 0.5s. Applied via `.animate-shake` class. |

---

## PAGE 3: DASHBOARD (`/dashboard`)

| What The Mentor Points At | File | CSS File | How It Works |
|---|---|---|---|
| **The entire dashboard** | `pages/Dashboard.jsx` | `pages/Dashboard.css` | Two-column grid: left sidebar (profile + goals) + center (stats + chart). Data comes from `useDashboard()` hook. |
| **Profile card with avatar** | `pages/Dashboard.jsx` (L538-581) | `pages/Dashboard.css` | Avatar loaded via `getAvatarById(user.avatar_id)` from `config/avatarConfig.js`. Level progress bar uses `width: ${levelProgress}%` inline style. |
| **Circular "Daily Goal" ring** | `pages/Dashboard.jsx` (L30-55) — `ProgressRing` component | `pages/Dashboard.css` | SVG circle with `stroke-dasharray` calculated as `(progress/100) * circumference`. As progress increases, the colored arc grows. |
| **Stat cards (Total Attempts, Average Score, etc.)** | `pages/Dashboard.jsx` (L634-679) | `pages/Dashboard.css` | Four cards in a CSS grid. Each shows a label, value, and a mini Sparkline chart. |
| **Mini sparkline charts on stat cards** | `pages/Dashboard.jsx` (L58-122) — `Sparkline` component | `pages/Dashboard.css` | Uses HTML5 `<canvas>`. Draws a smooth curve using `quadraticCurveTo()` with gradient fill below. 120x36px canvas. |
| **Weekly Progress line chart** | `pages/Dashboard.jsx` (L125-323) — `WeeklyChart` component | `pages/Dashboard.css` | Canvas-based chart with HiDPI support (`devicePixelRatio`). Draws: dashed grid lines, gradient area fill, smooth bezier curve line, data point dots, axis labels. Tooltip shows on mouse hover via `onMouseMove`. |
| **Milestone badges** | `pages/Dashboard.jsx` (L326-419) — `MilestoneBadge` component | `components/progress/MilestonesBadges.css` | SVG progress ring around each badge icon. Earned badges get a green check overlay. Unearned show fill progress. |
| **"AI Insight" card** | `pages/Dashboard.jsx` (L691-702) | `pages/Dashboard.css` | Static text card with Sparkles icon. The AI text is hardcoded (not from API). |
| **Skeleton loading state** | `components/DashboardSkeleton.jsx` | `components/DashboardSkeleton.css` | Shows while `useDashboard()` is loading. Uses `@keyframes shimmer` — a gradient that slides horizontally across gray boxes. |
| **Session History / Phoneme Mastery tables** | `components/dashboard/bottom/SessionHistory.jsx`, `PhonemeMastery.jsx` | Same directory CSS | Bottom 2x2 grid. Data from `useDashboard()` response. |

---

## PAGE 4: PRACTICE (`/practice`)

| What The Mentor Points At | File | CSS File | How It Works |
|---|---|---|---|
| **Level selector (Beginner/Intermediate/Advanced)** | `components/practice/LevelSelector.jsx` | In practice component CSS | Three buttons. Selected level stored in `localStorage`. Changes which sentences are fetched. |
| **Sublevel selector grid** | `components/practice/SublevelSelector.jsx` | In practice component CSS | Grid of sublevel buttons (1.1, 1.2, etc.). Completed sublevels show checkmarks. |
| **Current sentence display** | `pages/Practice.jsx` (main render area) | `pages/Practice.css` | `sentences[currentIndex].text` displayed in large text. Navigation arrows change `currentIndex`. |
| **"Listen" button (plays TTS audio)** | `pages/Practice.jsx` (reference audio logic) | `pages/Practice.css` | Fetches WAV from `ENDPOINTS.SENTENCES.AUDIO(id)` with JWT auth header. Pre-fetched in `useEffect` on sentence change for instant playback. Uses HTML5 `<audio>` element. |
| **Waveform bars during recording** | `pages/Practice.jsx` (L45-122) — `WaveformVisualizer` | `pages/Practice.css` | Creates `AudioContext` + `AnalyserNode` from mic stream. `getByteFrequencyData()` fills array with frequency amplitudes. Draws vertical gradient bars on `<canvas>` using `requestAnimationFrame` at 60fps. |
| **Record / Stop / Submit buttons** | `pages/Practice.jsx` (startRecording/stopRecording/handleSubmit) | `pages/Practice.css` | Record: `navigator.mediaDevices.getUserMedia` → `MediaRecorder.start()`. Stop: `.stop()` → creates Blob. Submit: wraps in FormData → `api.uploadAudio()`. |
| **Recording timer (00:05 / 00:30)** | `pages/Practice.jsx` | `pages/Practice.css` | `setInterval` every 1 second increments `duration` state. Auto-stops at `maxDuration` (30s). Formatted as MM:SS. |
| **Progress bar during recording** | `pages/Practice.jsx` | `pages/Practice.css` | `width: ${(duration / maxDuration) * 100}%` — simple inline style percentage. |
| **Score ring (85%)** | `pages/Practice.jsx` (L166-191) — `ScoreRing` | `pages/Practice.css` | SVG circle: `strokeDasharray = (score * circumference) + " " + circumference`. Green if ≥70%, amber otherwise. |
| **Word heatmap (green/amber/red words)** | `pages/Practice.jsx` (L125-163) — `WordHeatmap` | `pages/Practice.css` | Splits sentence into words. Each word gets a score and colored class: `.practice__heatmap-word--correct` (green), `--needs-work` (amber), `--incorrect` (red). Icons: Check, AlertCircle, X from lucide-react. |
| **Content mismatch error** | `components/practice/MistakePanel.jsx` — `ContentMismatchError` | Practice CSS | Shows when ASR detects user said different words. Displays expected vs transcribed text with a retry button. |
| **Pipeline loader (Cleaning → Analyzing → Scoring)** | `components/practice/PipelineLoader.jsx` | Practice CSS | Step-by-step animation showing NLP pipeline stages while backend processes. |
| **AI Insights panel** | `components/practice/insights/InsightsPanel.jsx` | Practice CSS | Shows LLM feedback. Initially shows fallback text, then updates when polling receives LLM response. |
| **Session progress indicator** | `components/practice/SessionProgressIndicator.jsx` | Practice CSS | Shows `completedCount / totalSentences` with a progress bar. |

---

## PAGE 5: SETTINGS (`/settings`)

| What The Mentor Points At | File | CSS File | How It Works |
|---|---|---|---|
| **Theme toggle (Light/Dark)** | `pages/SettingsPage.jsx` | `pages/SettingsPage.css` | Calls `updateSetting('theme', 'dark')` from `SettingsContext`. This sets `data-theme="dark"` on `<html>`, which activates CSS variable overrides in `styles/theme.css`. |
| **Color preset circles** | `pages/SettingsPage.jsx` | `pages/SettingsPage.css` | Colored circles from `COLOR_PRESETS` in `globalConfig.js`. Clicking one calls `updateSetting('primaryColor', preset.value)` which sets CSS variables `--color-primary-*` on `:root`. |
| **Font size slider** | `pages/SettingsPage.jsx` | `pages/SettingsPage.css` | HTML `<input type="range">`. Changes `fontScale` in settings, which sets `root.style.fontSize = 16 * (scale/100) + 'px'`. All `rem` and `em` units scale proportionally. |

---

## GLOBAL ELEMENTS (Visible On Every Page)

| What The Mentor Points At | File (JSX) | File (CSS) | How It Works |
|---|---|---|---|
| **Navigation bar (authenticated)** | `components/Navbar.jsx` | `components/Navbar.css` | Flexbox layout. Left: logo. Center: NavLinks with active highlight via `NavLink`'s `isActive` callback. Right: streak counter, notification bell, user dropdown. |
| **Landing page navbar** | `components/landing/Navbar.jsx` | `components/landing/Navbar.css` | Simpler version for public pages. Shows Login button instead of user menu. |
| **Streak fire icon with number** | `components/Navbar.jsx` (L136-139) | `components/Navbar.css` | Flame icon from `lucide-react`. Streak number from `useDashboard()` — shared cache, no extra API call. |
| **User dropdown menu** | `components/Navbar.jsx` (L156-225) | `components/Navbar.css` | `useState` toggles visibility. `useRef` + `mousedown` event listener closes on outside click. |
| **Toast notifications** | `components/Toast.jsx` | `components/Toast.css` | Fixed position bottom-right. `UIContext` manages a `toasts[]` array. Each toast has type (success/error/warning/info) mapped to icons and colors. Auto-dismiss via `setTimeout`. Slide-in animation from `@keyframes toastSlideIn` in `animations.css`. |
| **Modal dialogs** | `components/Modal.jsx` | `components/Modal.css` | Overlay with `z-index: 50`. Focus trap: saves `document.activeElement`, focuses modal, restores on close. Esc key closes via `useKeyboard` hook. Body scroll locked with `overflow: hidden`. |
| **Loading spinner** | `components/Loader.jsx` | `components/Loader.css` | SVG-based spinner: two `<circle>` elements — one is the track, one is the indicator with `@keyframes spin`. Also has skeleton (shimmer), overlay, and inline variants. |
| **Error state** | `components/ErrorState.jsx` | `components/ErrorState.css` | Reusable error display with icon, title, message, and retry button. |

---

## GLOBAL CSS FILES

| File | What It Controls |
|---|---|
| `styles/index.css` | Base reset, body defaults, scrollbar styling, layout classes |
| `styles/theme.css` | `[data-theme="light"]` and `[data-theme="dark"]` CSS variable definitions |
| `styles/tokens.css` | Design tokens: colors, spacing, radii, shadows, z-index scales |
| `styles/animations.css` | ALL keyframe animations: fadeIn, fadeInUp, scaleIn, slideIn, spin, pulse, bounce, shake, shimmer, waveform, toastSlide. Also 3D utilities and `prefers-reduced-motion` media query. |

---

## ICONS — Where Do They Come From?

**Library:** `lucide-react` (installed via npm)
**Usage:** Import by name, render as component
```jsx
import { Mic, Play, Flame, Target, Award } from 'lucide-react';
<Mic size={20} />  // Renders as inline SVG
```
"All icons are SVG components from the Lucide icon library. They render as inline SVG, which means they scale perfectly and can be colored with CSS `color` property via `stroke: currentColor`."

---

## ANIMATION LIBRARY — Framer Motion

**Library:** `framer-motion` (installed via npm)
**Used for:** Page transitions, scroll-linked animations, spring physics, viewport detection

```jsx
// Fade in on mount
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

// Staggered children animation
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };

// Scroll-linked parallax
const { scrollY } = useScroll();
const y = useTransform(scrollY, [0, 500], [0, -150]);

// Spring physics
const scale = useSpring(value, { stiffness: 100, damping: 30 });

// Viewport detection
const isInView = useInView(ref, { once: true });
```

**Q: Why framer-motion instead of CSS animations?**
"CSS animations are great for simple effects (fade, slide, spin). But framer-motion gives us:
1. Scroll-linked animations (parallax blobs)
2. Spring physics (3D card tilt)
3. Gesture detection (whileTap scale)
4. AnimatePresence (animate elements out before unmounting)
5. Variant orchestration (stagger children animations)
These are extremely complex to do with pure CSS."

---

## QUICK ANSWERS FOR COMMON QUESTIONS

**"How does the dark mode work?"**
"In `SettingsContext`, when the user selects dark mode, we set `data-theme='dark'` on the HTML root element. In `theme.css`, we have `[data-theme='dark']` selectors that override CSS variables like `--bg-primary` from white to dark. Every component uses these variables, so everything switches instantly. No JavaScript re-renders needed."

**"Where are the colors defined?"**
"In three places: (1) `styles/tokens.css` for base colors, (2) `styles/theme.css` for light/dark variants, (3) `config/globalConfig.js` for the user-selectable primary color presets. When a user picks a color, `SettingsContext` sets CSS custom properties on `:root`."

**"How do the charts work?"**
"All charts (Sparkline, WeeklyChart, WaveformVisualizer) use HTML5 Canvas API. I draw directly on a `<canvas>` element using `getContext('2d')`. For HiDPI displays, I scale the canvas by `devicePixelRatio` to prevent blurry rendering. The weekly chart supports mouse hover tooltips via `onMouseMove` event."

**"Why not use a charting library like Chart.js?"**
"Custom canvas gives full control over appearance and keeps bundle size small. Chart.js adds ~60KB to the bundle. Our charts are simple enough that the custom implementation is ~100 lines each."

**"How does the recording waveform work?"**
"The `WaveformVisualizer` creates a Web Audio API `AudioContext` and `AnalyserNode`. The analyser does FFT (Fast Fourier Transform) on the microphone audio stream, giving us frequency amplitude data. We draw vertical bars on a canvas where each bar's height represents the amplitude of a frequency band. `requestAnimationFrame` redraws at 60fps for smooth animation."
