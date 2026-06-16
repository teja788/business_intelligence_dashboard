/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // The theme is driven by CSS variables (see src/ui/theme.css) so a future
      // theme registry can swap palettes without touching component classes.
      colors: {
        bg: {
          base: 'rgb(var(--v-bg-base) / <alpha-value>)',
          panel: 'rgb(var(--v-bg-panel) / <alpha-value>)',
          elevated: 'rgb(var(--v-bg-elevated) / <alpha-value>)',
          inset: 'rgb(var(--v-bg-inset) / <alpha-value>)',
        },
        border: {
          subtle: 'rgb(var(--v-border-subtle) / <alpha-value>)',
          strong: 'rgb(var(--v-border-strong) / <alpha-value>)',
        },
        content: {
          primary: 'rgb(var(--v-content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--v-content-secondary) / <alpha-value>)',
          muted: 'rgb(var(--v-content-muted) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--v-accent) / <alpha-value>)',
          soft: 'rgb(var(--v-accent-soft) / <alpha-value>)',
        },
        accent2: {
          DEFAULT: 'rgb(var(--v-accent2) / <alpha-value>)',
        },
        // Associative selection states (Qlik green/white/grey).
        assoc: {
          selected: 'rgb(var(--v-assoc-selected) / <alpha-value>)',
          possible: 'rgb(var(--v-assoc-possible) / <alpha-value>)',
          excluded: 'rgb(var(--v-assoc-excluded) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
