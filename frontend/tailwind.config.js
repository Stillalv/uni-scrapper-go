/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mac: {
          bg: '#141416',
          card: '#26262c',
          sidebar: '#16161a',
          border: 'rgba(255,255,255,0.08)',
          accent: '#0071E3',
          accentDark: '#0A84FF',
          accentHover: '#0077ED',
          text: '#1d1d1f',
          textDark: '#ededef',
          subtext: '#86868b',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          indigo: '#5856D6',
          purple: '#AF52DE',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
