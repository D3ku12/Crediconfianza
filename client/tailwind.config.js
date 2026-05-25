/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F0FF',
          100: '#E0E0FF',
          200: '#C4C4FF',
          300: '#A8A8FF',
          400: '#8C8CFF',
          500: '#6C63FF',
          600: '#5A52E0',
          700: '#4A44C0',
          800: '#3A36A0',
          900: '#2A2880',
        },
        success: {
          50: '#E6FFF8',
          100: '#B3FFE8',
          500: '#00C896',
          700: '#009E78',
        },
        danger: {
          50: '#FFE8EB',
          100: '#FFB3BE',
          500: '#FF4757',
          700: '#CC293B',
        },
        warning: {
          50: '#FFF8E6',
          100: '#FFEBB3',
          500: '#FFB830',
          700: '#CC8F00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
