/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          base: '#030710',
          panel: '#070f1e',
          panel2: '#0b162c',
          panel3: '#0f203f',
          card: '#081324',
          surface: '#050b16'
        },
        border: {
          dim: '#102238',
          mid: '#1a365d',
          bright: '#234e85',
          gold: '#c8922a',
          'gold-light': '#f5c842',
          cyan: '#00d4f0'
        },
        gold: {
          DEFAULT: '#e8a830',
          light: '#f5c842',
          bright: '#ffeaa7',
          dim: '#8a5a14',
          dark: '#5c3a09'
        },
        cyan: {
          DEFAULT: '#00d4f0',
          bright: '#70f3ff',
          dim: '#005f78',
          glow: 'rgba(0, 212, 240, 0.3)'
        },
        elem: {
          fire: '#ff6820',
          'fire-glow': 'rgba(255, 104, 32, 0.4)',
          water: '#00aaee',
          'water-glow': 'rgba(0, 170, 238, 0.4)',
          earth: '#c8a020',
          'earth-glow': 'rgba(200, 160, 32, 0.4)',
          wind: '#50e080',
          'wind-glow': 'rgba(80, 224, 128, 0.4)',
          lightning: '#c880ff',
          'lightning-glow': 'rgba(200, 128, 255, 0.4)',
          ice: '#40c8ff',
          'ice-glow': 'rgba(64, 200, 255, 0.4)'
        }
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)', 'Orbitron', 'sans-serif'],
        rajdhani: ['var(--font-rajdhani)', 'Rajdhani', 'sans-serif']
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(232, 168, 48, 0.5), inset 0 0 10px rgba(232, 168, 48, 0.2)',
        'cyan-glow': '0 0 20px rgba(0, 212, 240, 0.5), inset 0 0 10px rgba(0, 212, 240, 0.2)',
        'fire-glow': '0 0 20px rgba(255, 104, 32, 0.6), inset 0 0 10px rgba(255, 104, 32, 0.3)',
        'ice-glow': '0 0 20px rgba(64, 200, 255, 0.6), inset 0 0 10px rgba(64, 200, 255, 0.3)',
        'lightning-glow': '0 0 20px rgba(200, 128, 255, 0.6), inset 0 0 10px rgba(200, 128, 255, 0.3)',
        'panel-luxury': '0 0 35px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 212, 240, 0.05)',
        'card-elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
      },
      animation: {
        'spin-slow': 'spin 30s linear infinite',
        'spin-reverse-slow': 'spin-reverse 40s linear infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'stream-flow': 'stream-flow 3.5s ease-in-out infinite',
        'corner-glow': 'corner-glow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'float': 'float 3.5s ease-in-out infinite',
        'scanline': 'scanline 4s linear infinite'
      },
      keyframes: {
        'spin-reverse': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.7', filter: 'drop-shadow(0 0 8px rgba(0,212,240,0.4))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 20px rgba(0,212,240,0.9))' }
        },
        'stream-flow': {
          '0%': { strokeDashoffset: '240' },
          '100%': { strokeDashoffset: '0' }
        },
        'corner-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(0,212,240,0.4))' },
          '50%': { filter: 'drop-shadow(0 0 16px rgba(0,212,240,0.9))' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        }
      }
    }
  },
  plugins: []
};
