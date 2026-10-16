import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    files: ['**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn'
    }
  },
  {
    // Config files run in Node, not the browser.
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node }
  }
];
