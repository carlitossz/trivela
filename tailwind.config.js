/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#0E0E0E',
        panel: '#1A1A1A',
        panel2: '#242424',
        line: '#2A2A2A',
        line2: '#3A3A3A',
        muted: '#A3A3A3',
        soft: '#BDBDBD',
        wa: '#25D366',
        paper: '#F4F4F2',
        rule: '#E4E4E0'
      }
    }
  },
  plugins: []
}
