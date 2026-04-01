/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dynamicColor: (cssVar) => `rgb(var(${cssVar}) / <alpha-value>)`,
        // Cores institucionais do Telier - neutras frias
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
        // Cores funcionais — usam CSS vars para reatividade ao tema
        success: {
          50: 'var(--color-success-50)',
          100: 'var(--color-success-100)',
          200: '#a7f3d0',
          300: '#6ee7b7',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: '#047857',
          DEFAULT: 'var(--color-success-600)',
          subtle: 'var(--color-success-100)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          200: '#fde68a',
          300: '#fcd34d',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: '#b45309',
          DEFAULT: 'var(--color-warning-600)',
          subtle: 'var(--color-warning-100)',
        },
        error: {
          50: 'var(--color-error-50)',
          100: 'var(--color-error-100)',
          200: '#fecaca',
          300: '#fca5a5',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: '#b91c1c',
          DEFAULT: 'var(--color-error-600)',
          subtle: 'var(--color-error-100)',
        },
        info: {
          50: 'rgb(var(--color-info-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--color-info-100-rgb) / <alpha-value>)',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: 'var(--color-info-500)',
          600: 'var(--color-info-600)',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          DEFAULT: 'var(--color-info-600)',
          subtle: 'rgb(var(--color-info-100-rgb) / <alpha-value>)',
        },
        surface: {
          primary: 'rgb(var(--color-surface-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-surface-secondary-rgb) / <alpha-value>)',
          tertiary: 'rgb(var(--color-surface-tertiary-rgb) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated-rgb) / <alpha-value>)',
          overlay: 'rgb(var(--color-surface-overlay-rgb) / <alpha-value>)',
        },
        background: {
          primary: 'rgb(var(--color-background-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-background-secondary-rgb) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
          tertiary: 'rgb(var(--color-text-tertiary-rgb) / <alpha-value>)',
          disabled: 'rgb(var(--color-text-disabled-rgb) / <alpha-value>)',
          inverse: 'rgb(var(--color-text-inverse-rgb) / <alpha-value>)',
          muted: 'rgb(var(--color-text-tertiary-rgb) / <alpha-value>)',
        },
        border: {
          primary: 'rgb(var(--color-border-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-border-secondary-rgb) / <alpha-value>)',
          subtle: 'rgb(var(--color-border-secondary-rgb) / <alpha-value>)',
          focus: 'var(--color-info-500)',
          error: 'var(--color-error-500)',
        },
        primary: {
          DEFAULT: 'var(--color-info-500)',
          subtle: 'rgb(var(--color-info-100-rgb) / <alpha-value>)',
        },
        alert: {
          DEFAULT: 'var(--color-error-600)',
          subtle: 'var(--color-error-100)',
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
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        drawer: 'var(--shadow-drawer)',
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
