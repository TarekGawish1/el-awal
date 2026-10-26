/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF4FF',
          100: '#D9E5FF',
          200: '#B9CEFF',
          300: '#8EB0FF',
          400: '#5D8CFF',
          500: '#3366FF',
          600: '#1E4BD9',
          700: '#1537B0',
          800: '#102B8A',
          900: '#0B1E63',
          DEFAULT: '#1E4BD9',
        },
        secondary: {
          50: '#F0F7F7',
          100: '#D9EBEB',
          200: '#B3D6D6',
          300: '#87BDBE',
          400: '#5C9FA1',
          500: '#3F8486',
          600: '#2E6A6C',
          700: '#225152',
          800: '#193D3E',
          900: '#102929',
          DEFAULT: '#2E6A6C',
        },
        neutral: {
          25: '#FCFDFF',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
    },
  },
  plugins: [],
};
