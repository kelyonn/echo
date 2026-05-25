const tailwindPostcss = require('@tailwindcss/postcss');

module.exports = {
  plugins: [
    // Use the new Tailwind PostCSS plugin package
    tailwindPostcss(),
    require('autoprefixer'),
  ],
};
