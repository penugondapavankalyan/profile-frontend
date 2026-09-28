import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        window: 'readonly', document: 'readonly', localStorage: 'readonly',
        IntersectionObserver: 'readonly', AbortController: 'readonly', AbortSignal: 'readonly', fetch: 'readonly', crypto: 'readonly'
      },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    files: ['**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn'
    }
  }
];
