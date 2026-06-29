import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        road: {
          50: '#fdf8ee',
          100: '#faefd3',
          200: '#f5dba2',
          300: '#eec166',
          400: '#e8a838',
          500: '#e19020',
          600: '#c97014',
          700: '#a75314',
          800: '#874117',
          900: '#6f3617',
        },
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 8px 24px 0 rgb(37 99 235 / 0.12), 0 2px 8px -2px rgb(0 0 0 / 0.1)',
        'glow-blue': '0 0 20px rgb(59 130 246 / 0.3)',
        'glow-road': '0 0 20px rgb(225 144 32 / 0.3)',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-road': 'pulseRoad 2s ease-in-out infinite',
        'dash': 'dash 20s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'draw-line': 'drawLine 1.5s ease-out forwards',
        'pin-drop': 'pinDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseRoad: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        dash: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '1000', strokeDasharray: '1000' },
          '100%': { strokeDashoffset: '0', strokeDasharray: '1000' },
        },
        pinDrop: {
          '0%': { transform: 'translateY(-20px) scale(0.5)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'road-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232563eb' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
export default config
