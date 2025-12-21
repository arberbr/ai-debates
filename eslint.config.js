import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist', 'backend/dist', 'backend/**/*.js', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow 'any' type - sometimes necessary for dynamic APIs and error handling
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow setState in effects for localStorage initialization (common pattern)
      'react-hooks/set-state-in-effect': 'warn',
      // Allow component files to export constants (shadcn/ui pattern)
      'react-refresh/only-export-components': 'warn',
    },
  },
]
