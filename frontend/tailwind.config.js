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
          bg: '#1e1e1e',
          card: '#252526',
          sidebar: '#181818',
          border: '#333333',
          accent: '#007aff',
          accentHover: '#0062cc',
          text: '#f5f5f7',
          subtext: '#86868b',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
