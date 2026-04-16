# UI/UX & CSS Deep Dive

## 1. Styling Architecture

### Approach: Tailwind CSS + Custom CSS Modules
"We use Tailwind CSS as the primary styling framework for utility-first rapid development. Custom CSS is used for complex animations, transitions, and effects that Tailwind alone cannot handle."

### Global Configuration (`config/globalConfig.js`)
```javascript
export const DEFAULT_SETTINGS = {
    theme: 'light',            // 'light' | 'dark'
    primaryColor: '#059669',   // Emerald-500
    fontScale: 100,            // 100% = 16px base
};

export const COLOR_PRESETS = [
    { name: 'Emerald', value: '#059669', shades: { 50: '#ecfdf5', ..., 900: '#064e3b' } },
    { name: 'Rose',    value: '#e11d48', shades: { ... } },
    { name: 'Amber',   value: '#d97706', shades: { ... } },
    { name: 'Teal',    value: '#0d9488', shades: { ... } },
];
```

**Q: How does the theming system work?**
"A three-layer system:
1. **CSS Custom Properties** — Set on `:root` from JavaScript
2. **Tailwind** — References these properties via `var(--color-primary-500)`
3. **SettingsContext** — Watches for changes and updates the DOM properties

When a user selects 'Rose' as their primary color, `applySettingsToDOM()` sets `--color-primary-500: #f43f5e` on the HTML root element. Every component using `text-primary-500` or `bg-primary-500` instantly updates via CSS cascade."

---

## 2. Dark/Light Mode

### Implementation
```javascript
// SettingsContext.jsx
document.documentElement.setAttribute('data-theme', currentSettings.theme);
```

```css
/* index.css */
:root {
    --bg-primary: #ffffff;
    --text-primary: #1a1a2e;
    --card-bg: #ffffff;
}

[data-theme="dark"] {
    --bg-primary: #0f0f23;
    --text-primary: #e2e8f0;
    --card-bg: #1a1a2e;
}
```

**Q: Why `data-theme` attribute instead of CSS `prefers-color-scheme`?**
"`prefers-color-scheme` follows the OS setting — the user can't override it within the app. Using `data-theme`, we give users explicit control. They can use dark mode even if their OS is in light mode, or vice versa."

**Q: How do components adapt to theme?**
```css
.card {
    background: var(--card-bg);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}
```
"All components use CSS variables instead of hardcoded colors. When `data-theme` changes, the variable values change, and everything updates automatically. No JavaScript, no re-renders."

---

## 3. Layout Techniques

### Flexbox — Used For
```css
/* Navigation bar - horizontal layout with spacing */
.navbar {
    display: flex;
    justify-content: space-between;  /* Logo left, nav right */
    align-items: center;             /* Vertically center items */
    gap: 1rem;                       /* Consistent spacing */
}

/* Dashboard stat cards - responsive grid */
.stats-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
}

.stat-card {
    flex: 1 1 250px;  /* Grow, shrink, min-width 250px */
    /* Cards auto-flow to next row when they can't fit */
}
```

**Q: What does `flex: 1 1 250px` mean?**
- `flex-grow: 1` — Can grow to fill available space
- `flex-shrink: 1` — Can shrink if needed
- `flex-basis: 250px` — Start at 250px wide

### CSS Grid — Used For
```css
/* Dashboard layout - sidebar + main content */
.app-layout {
    display: grid;
    grid-template-columns: 280px 1fr;  /* Fixed sidebar, flexible content */
    grid-template-rows: 64px 1fr;      /* Fixed header, flexible body */
    height: 100vh;
}

/* Practice page - 3-panel layout */
.practice-layout {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;  /* Sidebar | Main | Details */
    gap: 1.5rem;
    height: calc(100vh - 64px);           /* Full height minus navbar */
}
```

**Q: When to use Flexbox vs Grid?**
"**Flexbox** is one-dimensional — rows OR columns. Perfect for navigation bars, button groups, card rows.
**Grid** is two-dimensional — rows AND columns simultaneously. Perfect for page layouts, dashboard grids, and complex multi-panel interfaces."

### Responsive Design
```css
/* Mobile-first: default is small screen */
.practice-layout {
    display: grid;
    grid-template-columns: 1fr;  /* Single column on mobile */
}

/* Tablet */
@media (min-width: 768px) {
    .practice-layout {
        grid-template-columns: 1fr 1fr;  /* Two columns */
    }
}

/* Desktop */
@media (min-width: 1024px) {
    .practice-layout {
        grid-template-columns: 1fr 2fr 1fr;  /* Three-panel */
    }
}
```

**Q: What is mobile-first design?**
"Writing CSS for the smallest screen first, then adding styles for larger screens with `min-width` media queries. This ensures mobile users download minimal CSS and desktop-specific styles are progressive enhancements."

---

## 4. Important CSS Properties Used

### `calc()` — Dynamic Calculations
```css
.main-content {
    height: calc(100vh - 64px);  /* Full viewport minus navbar height */
    padding: calc(1rem + 0.5vw); /* Responsive padding */
}
```
"Combines different units in real-time. The browser computes the final value on every resize."

### `overflow: auto` vs `overflow: hidden`
```css
.sidebar {
    overflow-y: auto;    /* Scrollbar appears when content overflows */
}

.results-panel {
    overflow: hidden;    /* Content is clipped, no scrollbar */
}
```

### `position: sticky`
```css
.sidebar-header {
    position: sticky;
    top: 0;              /* Sticks to top when scrolling */
    z-index: 10;
    background: var(--bg-primary);  /* Prevent content showing through */
}
```
"The element scrolls normally until it reaches the `top: 0` threshold, then it 'sticks' and stays visible. Used for section headers in scrollable sidebars."

### `z-index` (Layering)
```css
/* Stacking order in the app */
.sidebar      { z-index: 10; }   /* Above content */
.modal-overlay { z-index: 50; }  /* Above everything */
.modal-content { z-index: 51; }  /* Above overlay */
.toast         { z-index: 100; } /* Above modals */
```

### `transition` and `transform` — Smooth Animations
```css
.button {
    transition: all 0.2s ease-in-out;  /* 200ms smooth transition */
}

.button:hover {
    transform: translateY(-2px);     /* Lift up 2px on hover */
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.button:active {
    transform: translateY(0);        /* Press down on click */
}
```

**Q: Why `transform` instead of changing `margin-top`?**
"**Performance.** `transform` is handled by the GPU compositor and doesn't trigger layout recalculation. Changing `margin-top` triggers a full layout reflow, which is expensive and causes janky animations."

### `backdrop-filter` — Glassmorphism
```css
.glass-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
}
```
"Makes the background behind the element blurry, creating a frosted glass effect. Used in modals and overlays for premium look."

---

## 5. Animations & Transitions

### CSS Keyframe Animations
```css
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.card {
    animation: fadeInUp 0.5s ease-out;  /* Cards slide up when they appear */
}
```

### Staggered Animation (Dashboard Cards)
```css
.stat-card:nth-child(1) { animation-delay: 0.0s; }
.stat-card:nth-child(2) { animation-delay: 0.1s; }
.stat-card:nth-child(3) { animation-delay: 0.1s; }
.stat-card:nth-child(4) { animation-delay: 0.2s; }
```
"Each card appears slightly after the previous one, creating a cascade effect."

### Recording Pulse Animation
```css
@keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.1); opacity: 0.7; }
}

.recording-indicator {
    animation: pulse 1.5s ease-in-out infinite;
    background: #ef4444;  /* Red dot */
    border-radius: 50%;
    width: 16px;
    height: 16px;
}
```
"A pulsing red dot that indicates the microphone is actively recording."

### Score Ring Animation
```css
.score-ring {
    stroke-dasharray: 283;  /* Circumference of circle */
    stroke-dashoffset: 283; /* Start hidden */
    animation: fillRing 1s ease-out forwards;
}

@keyframes fillRing {
    to {
        stroke-dashoffset: calc(283 - (283 * var(--score)));
        /* Reveals the arc proportional to the score */
    }
}
```
"An SVG circular progress ring that animates to show the pronunciation score. A score of 0.82 fills 82% of the ring."

---

## 6. Specific UI Effects

### Waveform Visualization
"Real-time audio waveform display during recording using Web Audio API's `AnalyserNode`. The waveform is drawn on a `<canvas>` element using `requestAnimationFrame` for smooth 60fps rendering."

### Score Color Coding
```javascript
function getScoreColor(score) {
    if (score >= 0.85) return 'var(--color-success)';    // Green
    if (score >= 0.70) return 'var(--color-warning)';    // Amber
    return 'var(--color-error)';                          // Red
}
```
"Phoneme scores are visually color-coded: green for good (85%+), amber for needs work (70-85%), red for weak (<70%). This gives instant visual feedback without reading numbers."

### Word Highlight Effect
```css
.word-correct { color: var(--color-success); }
.word-wrong   { color: var(--color-error); text-decoration: underline wavy; }
.word-missing { color: var(--color-error); opacity: 0.5; font-style: italic; }
```
"In the results view, each word is colored based on accuracy. Wrong words get a red wavy underline (like a spell checker), and missing words are shown in faded italic."

### Toast Notifications
```css
.toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 100;
    transform: translateX(120%);          /* Start off-screen */
    animation: slideIn 0.3s ease-out forwards;
}

@keyframes slideIn {
    to { transform: translateX(0); }
}
```
"Toast notifications slide in from the right, stay for 3-5 seconds, then auto-dismiss. Managed by `UIContext` so any component can trigger a toast."

---

## 7. SVG Icons (No Emojis)

**Q: Why SVGs instead of emojis?**
"Three reasons:
1. **Consistency** — Emojis look different on every OS/browser. SVGs look identical everywhere.
2. **Theming** — SVGs can be colored with CSS (`fill: currentColor`), so they automatically adapt to light/dark mode.
3. **Professional quality** — SVGs scale perfectly at any size without pixelation."

```jsx
// Example: Custom SVG icon component
function MicrophoneIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
    );
}
```

---

## 8. Accessibility Considerations

```html
<!-- Screen reader friendly -->
<button aria-label="Start recording">
    <MicrophoneIcon />
</button>

<!-- Focus management -->
<input
    type="email"
    autoFocus           /* Focus on page load */
    aria-describedby="email-help"
    required
/>
<p id="email-help">We'll never share your email.</p>

<!-- Keyboard navigation -->
<div role="tablist">
    <button role="tab" aria-selected="true">Practice</button>
    <button role="tab" aria-selected="false">Results</button>
</div>
```
