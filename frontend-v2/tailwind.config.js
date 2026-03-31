/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores institucionais do Telier - neutras e funcionais
        telier: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
        },
        // Cores funcionais para estados
        success: {
          50: '#e6f4ea',
          100: '#ceead6',
          200: '#a8dab5',
          300: '#7ecf93',
          500: '#34a853',
          600: '#2d8e47',
          700: '#23733a',
          DEFAULT: '#34a853',
          subtle: '#ceead6',
        },
        warning: {
          50: '#fef7e0',
          100: '#feefc3',
          200: '#fdd663',
          300: '#fdc83c',
          500: '#fbbc04',
          600: '#e9a503',
          700: '#c88700',
          DEFAULT: '#e9a503',
          subtle: '#feefc3',
        },
        error: {
          50: '#fce8e6',
          100: '#fad2cf',
          200: '#f6b7b1',
          300: '#f28f86',
          500: '#ea4335',
          600: '#d23321',
          700: '#b3261e',
          DEFAULT: '#d23321',
          subtle: '#fad2cf',
        },
        info: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          500: '#4285f4',
          600: '#1a73e8',
          700: '#185abc',
          DEFAULT: '#1a73e8',
          subtle: '#d2e3fc',
        },
        surface: {
          primary: '#ffffff',
          secondary: '#f8f9fa',
          tertiary: '#f1f3f4',
          elevated: '#ffffff',
          overlay: 'rgba(255, 255, 255, 0.95)',
        },
        background: {
          primary: '#ffffff',
          secondary: '#f8f9fa',
        },
        text: {
          primary: '#202124',
          secondary: '#5f6368',
          tertiary: '#80868b',
          disabled: '#bdc1c6',
          inverse: '#ffffff',
          muted: '#80868b',
        },
        border: {
          primary: '#dadce0',
          secondary: '#e8eaed',
          subtle: '#e8eaed',
          focus: '#4285f4',
          error: '#ea4335',
        },
        primary: {
          DEFAULT: '#4285f4',
          subtle: '#d2e3fc',
        },
        alert: {
          DEFAULT: '#d23321',
          subtle: '#fad2cf',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
