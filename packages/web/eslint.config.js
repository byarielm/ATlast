import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import tailwindPlugin from 'eslint-plugin-tailwindcss';

export default [
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'build/**',
      '.netlify/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
    ],
  },

  // Base config for all files
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        // React
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'tailwindcss': tailwindPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
      tailwindcss: {
        callees: ['cn', 'cva', 'clsx'],
        config: 'tailwind.config.js',
      },
    },
    rules: {
      // TypeScript
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // React
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react/react-in-jsx-scope': 'off', // Not needed in React 18+
      'react/prop-types': 'off', // Using TypeScript
      'react/jsx-uses-react': 'off',

      // React Hooks
      ...reactHooksPlugin.configs.recommended.rules,

      // Accessibility (jsx-a11y)
      ...jsxA11yPlugin.configs.recommended.rules,
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['to'],
        },
      ],

      // Tailwind CSS
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/enforces-negative-arbitrary-values': 'warn',
      'tailwindcss/enforces-shorthand': 'warn',
      'tailwindcss/no-arbitrary-value': 'off', // Allow arbitrary values
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/no-custom-classname': [
        'warn',
        {
          whitelist: [], // Add custom classes here if needed
        },
      ],
      'tailwindcss/no-unnecessary-arbitrary-value': 'warn',
    },
  },
];
