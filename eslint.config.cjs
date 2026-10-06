const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const prettier = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = [
  eslint.configs.recommended,
  ...tseslint.configs['flat/recommended'],
  prettier,
  {
    files: ['{src,test}/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.mocha },
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
