module.exports = {
  presets: [
    require('pandasuite-bridge-react/tailwind-base')
  ],
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
};
