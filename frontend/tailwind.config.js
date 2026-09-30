/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0f1e',
        surface: '#0f1a2e',
        'surface-alt': '#1a2744',
        border: '#1e3a5f',
        accent: '#00b4d8',
        'accent-dim': '#0077b6',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        healthy: '#22c55e',
        warning: '#f59e0b',
        critical: '#ef4444',
        advisory: '#3b82f6',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
