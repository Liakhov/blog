/** @type {import("prettier").Config} */
export default {
  arrowParens: 'avoid',
  semi: true,
  tabWidth: 2,
  printWidth: 100,
  singleQuote: true,
  jsxSingleQuote: false,
  trailingComma: 'none',
  bracketSpacing: true,
  endOfLine: 'lf',
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles/global.css',
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro'
      }
    }
  ]
};
