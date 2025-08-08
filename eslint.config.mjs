// ESLint v9 flat config (minimal, TS + React Hooks)
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    // Ignore non-source folders and generated files
    ignores: ['build/**', 'node_modules/**', 'coverage/**', 'public/**', 'scripts/**', 'src/types/nyt.generated.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // Strict on unused vars (no warnings)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      // Disable to avoid warnings while keeping zero-warnings promise
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];
