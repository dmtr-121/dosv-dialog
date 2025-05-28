/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        'lg': '1.125rem',
      },
      colors: {
        // Extended indigo palette for gradient effects
        'indigo': {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Extended purple palette for complementary colors
        'purple': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'soundwave': 'soundwave 1s ease-in-out infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { 
            transform: 'scale(1)',
            opacity: '0.5',
          },
          '50%': { 
            transform: 'scale(1.05)',
            opacity: '0.25',
          },
          '100%': { 
            transform: 'scale(1)',
            opacity: '0.5',
          },
        },
        'ping': {
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
        'pulse': {
          '50%': {
            opacity: '.5',
          },
        },
        'soundwave': {
          '0%, 100%': { 
            height: '8px',
          },
          '50%': { 
            height: '16px',
          },
        },
        'wave': {
          '0%, 100%': {
            transform: 'scaleY(0.5)',
          },
          '50%': {
            transform: 'scaleY(1)',
          },
        },
        'bounce-gentle': {
          '0%, 100%': {
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },
      scale: {
        '102': '1.02',
        '98': '0.98',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      rotate: {
        '-1': '-1deg',
        '1': '1deg',
      },
    },
  },
  plugins: [],
};