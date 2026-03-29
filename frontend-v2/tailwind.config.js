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
          500: '#34a853',
          600: '#2d8e47',
        },
        warning: {
          50: '#fef7e0',
          100: '#feefc3',
          500: '#fbbc04',
          600: '#e9a503',
        },
        error: {
          50: '#fce8e6',
          100: '#fad2cf',
          500: '#ea4335',
          600: '#d23321',
        },
        info: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          500: '#4285f4',
          600: '#1a73e8',
        }
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
