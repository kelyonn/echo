module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 24px 80px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      },
    },
  },
  plugins: [],
};
