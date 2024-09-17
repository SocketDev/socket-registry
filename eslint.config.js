'use strict'

const path = require('node:path')

const { includeIgnoreFile } = require('@eslint/compat')
const js = require('@eslint/js')
const nodePlugin = require('eslint-plugin-n')
const tsEslint = require('typescript-eslint')
const tsParser = require('@typescript-eslint/parser')

const rootPath = __dirname
const gitignorePath = path.resolve(rootPath, '.gitignore')
const prettierignorePath = path.resolve(rootPath, '.prettierignore')
const {
  engines: { node: nodeRange }
} = require('./package.json')

module.exports = [
  includeIgnoreFile(gitignorePath),
  includeIgnoreFile(prettierignorePath),
  nodePlugin.configs['flat/recommended-script'],
  {
    files: ['packages/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: [],
          defaultProject: 'tsconfig.json',
          tsconfigRootDir: __dirname
        }
      }
    },
    plugins: {
      '@typescript-eslint': tsEslint.plugin
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    },
    rules: {
      '@typescript-eslint/no-floating-promises': ['error'],
      '@typescript-eslint/no-misused-promises': ['error'],
      // Returning unawaited promises in a try/catch/finally is dangerous
      // (the `catch` won't catch if the promise is rejected, and the `finally`
      // won't wait for the promise to resolve). Returning unawaited promises
      // elsewhere is probably fine, but this lint rule doesn't have a way
      // to only apply to try/catch/finally (the 'in-try-catch' option *enforces*
      // not awaiting promises *outside* of try/catch/finally, which is not what
      // we want), and it's nice to await before returning anyways, since you get
      // a slightly more comprehensive stack trace upon promise rejection.
      '@typescript-eslint/return-await': ['error', 'always'],
      'no-warning-comments': ['error']
    }
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off'
    }
  },
  {
    files: ['packages/**/*.js', 'scripts/**/*.js'],
    rules: {
      ...js.configs.recommended.rules,
      'n/exports-style': ['error', 'module.exports'],
      'n/no-unsupported-features/node-builtins': [
        'error',
        { ignores: ['buffer.resolveObjectURL', 'fetch'], version: nodeRange }
      ],
      'n/prefer-node-protocol': ['error'],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-warning-comments': ['error']
    }
  }
]
