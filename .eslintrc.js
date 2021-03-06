module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:react/recommended',
    'standard',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    '@typescript-eslint',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',

    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['off'],

    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',

    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': 'error',

    'operator-linebreak': ['error', 'before'],

    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never',
    }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}
