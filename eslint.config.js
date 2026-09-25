import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'src/emoji-data.js',
      '.specify/**',
      '.claude/**'
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module'
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error'
    }
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, browser: 'readonly' }
    }
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'tests/**/*.js', '*.config.js'],
    languageOptions: {
      globals: { ...globals.node }
    }
  },
  prettier
];
