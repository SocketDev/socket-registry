import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  convertIgnorePatternToMinimatch,
  includeIgnoreFile,
} from '@eslint/compat'
import js from '@eslint/js'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { flatConfigs as origImportXFlatConfigs } from 'eslint-plugin-import-x'
import nodePlugin from 'eslint-plugin-n'
import sortDestructureKeysPlugin from 'eslint-plugin-sort-destructure-keys'
import unicornPlugin from 'eslint-plugin-unicorn'
import globals from 'globals'
import fastGlob from 'fast-glob'
import tsEslint from 'typescript-eslint'

import constants from '@socketregistry/scripts/constants'
import { readPackageJsonSync } from '@socketsecurity/registry/lib/packages'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

const { gitIgnoreFile, npmPackagesPath, relNpmPackagesPath, rootTsConfigPath } =
  constants

const rootPath = __dirname

const nodeGlobalsConfig = Object.fromEntries(
  Object.entries(globals.node).map(([k]) => [k, 'readonly']),
)

const biomeConfigPath = path.join(rootPath, 'biome.json')
const biomeConfig = require(biomeConfigPath)
const biomeIgnores = {
  name: 'Imported biome.json ignore patterns',
  ignores: biomeConfig.files.includes
    .filter(p => p.startsWith('!'))
    .map(p => convertIgnorePatternToMinimatch(p.slice(1))),
}

const gitignorePath = path.join(rootPath, '.gitignore')
const gitIgnores = {
  ...includeIgnoreFile(gitignorePath),
  name: `Imported .gitignore ignore patterns`,
}

if (process.env.LINT_EXTERNAL) {
  const isNotExternalGlobPattern = p => !/(?:^|[\\/])external/.test(p)
  biomeIgnores.ignores = biomeIgnores.ignores?.filter(isNotExternalGlobPattern)
  gitIgnores.ignores = gitIgnores.ignores?.filter(isNotExternalGlobPattern)
}

function getIgnores(isEsm) {
  return constants.npmPackageNames.flatMap(sockRegPkgName => {
    const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
    const { type } = readPackageJsonSync(pkgPath)
    const ignored = []
    if (isEsm ? type !== 'module' : type === 'module') {
      ignored.push(`${relNpmPackagesPath}/${sockRegPkgName}/*`)
    } else if (!isEsm) {
      ignored.push(`${relNpmPackagesPath}/${sockRegPkgName}/*.mjs`)
      if (
        fastGlob.globSync(['**/*.cjs'], {
          cwd: pkgPath,
          ignores: constants.ignoreGlobs,
        }).length
      ) {
        ignored.push(`${relNpmPackagesPath}/${sockRegPkgName}/*.js`)
      }
    }
    return ignored
  })
}

function getImportXFlatConfigs(isEsm) {
  return {
    recommended: {
      ...origImportXFlatConfigs.recommended,
      languageOptions: {
        ...origImportXFlatConfigs.recommended.languageOptions,
        ecmaVersion: 'latest',
        sourceType: isEsm ? 'module' : 'script',
      },
    },
    typescript: {
      ...origImportXFlatConfigs.typescript,
      plugins: {
        ...origImportXFlatConfigs.recommended.plugins,
        ...origImportXFlatConfigs.typescript.plugins,
      },
      settings: {
        ...origImportXFlatConfigs.typescript.settings,
        'import-x/resolver-next': [
          createTypeScriptImportResolver({
            project: rootTsConfigPath,
          }),
        ],
      },
      rules: {
        ...origImportXFlatConfigs.recommended.rules,
        'import-x/extensions': [
          'error',
          'never',
          {
            cjs: 'ignorePackages',
            js: 'ignorePackages',
            json: 'always',
            mjs: 'ignorePackages',
          },
        ],
        'import-x/order': [
          'warn',
          {
            groups: [
              'builtin',
              'external',
              'internal',
              ['parent', 'sibling', 'index'],
              'type',
            ],
            pathGroups: [
              {
                pattern: '@socket{registry,security}/**',
                group: 'internal',
              },
            ],
            pathGroupsExcludedImportTypes: ['type'],
            'newlines-between': 'always',
            alphabetize: {
              order: 'asc',
            },
          },
        ],
        // TypeScript compilation already ensures that named imports exist in
        // the referenced module.
        'import-x/named': 'off',
        'import-x/no-named-as-default-member': 'off',
        'import-x/no-unresolved': 'off',
      },
    },
  }
}

function configs(sourceType) {
  const isEsm = sourceType === 'module'
  const ignores = getIgnores(isEsm)
  const importFlatConfigs = getImportXFlatConfigs(isEsm)
  const nodePluginConfigs =
    nodePlugin.configs[`flat/recommended-${isEsm ? 'module' : 'script'}`]
  const sharedPlugins = {
    ...nodePluginConfigs.plugins,
    'sort-destructure-keys': sortDestructureKeysPlugin,
    unicorn: unicornPlugin,
  }
  const sharedRules = {
    'n/exports-style': ['error', 'module.exports'],
    // The n/no-unpublished-bin rule does does not support non-trivial glob
    // patterns used in package.json "files" fields. In those cases we simplify
    // the glob patterns used.
    'n/no-unpublished-bin': 'error',
    'n/no-unsupported-features/es-builtins': [
      'error',
      {
        ignores: ['Object.groupBy'],
        version: constants.maintainedNodeVersions.current,
      },
    ],
    'n/no-unsupported-features/es-syntax': [
      'error',
      {
        ignores: ['object-map-groupby'],
        version: constants.maintainedNodeVersions.current,
      },
    ],
    'n/no-unsupported-features/node-builtins': [
      'error',
      {
        ignores: [
          'buffer.resolveObjectURL',
          'fetch',
          'fs.promises.cp',
          'process.features.require_module',
        ],
        version: constants.maintainedNodeVersions.current,
      },
    ],
    'n/prefer-node-protocol': 'error',
    'unicorn/consistent-function-scoping': 'error',
    curly: 'error',
    'no-await-in-loop': 'error',
    'no-control-regex': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-new': 'error',
    'no-proto': 'error',
    'no-undef': 'error',
    'no-self-assign': ['error', { props: false }],
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_|^this$',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
      },
    ],
    'no-var': 'error',
    'no-warning-comments': 'error',
    'prefer-const': 'error',
    'sort-destructure-keys/sort-destructure-keys': 'error',
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
  }

  return [
    {
      ...js.configs.recommended,
      ...importFlatConfigs.recommended,
      ...nodePluginConfigs,
      ignores,
      languageOptions: {
        ...js.configs.recommended.languageOptions,
        ...importFlatConfigs.recommended.languageOptions,
        ...nodePluginConfigs.languageOptions,
        globals: {
          ...js.configs.recommended.languageOptions?.globals,
          ...importFlatConfigs.recommended.languageOptions?.globals,
          ...nodePluginConfigs.languageOptions?.globals,
          ...nodeGlobalsConfig,
          NodeJS: false,
        },
        sourceType: isEsm ? 'module' : 'script',
      },
      plugins: {
        ...js.configs.recommended.plugins,
        ...importFlatConfigs.recommended.plugins,
        ...sharedPlugins,
      },
      rules: {
        ...js.configs.recommended.rules,
        ...importFlatConfigs.recommended.rules,
        ...nodePluginConfigs.rules,
        ...sharedRules,
      },
    },
    {
      files: ['**/*.{cts,mts,ts}'],
      ...js.configs.recommended,
      ...importFlatConfigs.typescript,
      ignores,
      languageOptions: {
        ...js.configs.recommended.languageOptions,
        ...importFlatConfigs.typescript.languageOptions,
        ecmaVersion: 'latest',
        sourceType,
        parser: tsEslint.parser,
        parserOptions: {
          ...importFlatConfigs.typescript.languageOptions?.parserOptions,
          projectService: {
            ...importFlatConfigs.typescript.languageOptions?.parserOptions
              ?.projectService,
            allowDefaultProject: [
              // Allow configs.
              '*.config.mts',
              // Add package type definitions.
              'packages/*/*/*.d.{cts,mts}',
            ],
            defaultProject: 'tsconfig.json',
            // Need this to glob packages/npm/* files.
            maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 1_000,
            tsconfigRootDir: __dirname,
          },
        },
      },
      plugins: {
        ...js.configs.recommended.plugins,
        ...importFlatConfigs.typescript.plugins,
        ...sharedPlugins,
        '@typescript-eslint': tsEslint.plugin,
      },
      rules: {
        ...js.configs.recommended.rules,
        ...importFlatConfigs.typescript.rules,
        ...sharedRules,
        '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
        '@typescript-eslint/consistent-type-assertions': [
          'error',
          { assertionStyle: 'as' },
        ],
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/no-misused-new': 'error',
        '@typescript-eslint/no-this-alias': [
          'error',
          { allowDestructuring: true },
        ],
        // Returning unawaited promises in a try/catch/finally is dangerous
        // (the `catch` won't catch if the promise is rejected, and the `finally`
        // won't wait for the promise to resolve). Returning unawaited promises
        // elsewhere is probably fine, but this lint rule doesn't have a way
        // to only apply to try/catch/finally (the 'in-try-catch' option *enforces*
        // not awaiting promises *outside* of try/catch/finally, which is not what
        // we want), and it's nice to await before returning anyways, since you get
        // a slightly more comprehensive stack trace upon promise rejection.
        '@typescript-eslint/return-await': ['error', 'always'],
        // Disable the following rules because they don't play well with TypeScript.
        'no-redeclare': 'off',
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['**/*.d.{cts,mts,ts}'],
      ignores,
      rules: {
        'n/no-unpublished-import': 'off',
        // Disable the following rules because they don't play well with TypeScript.
        'n/no-missing-import': 'off',
      },
    },
  ]
}

export default [
  gitIgnoreFile,
  biomeIgnores,
  {
    ignores: ['coverage/**', 'packages/npm/**/package'],
  },
  ...configs('script'),
  ...configs('module'),
  {
    // The external directory contains rollup-bundled dependencies that are
    // part of the published package. The n/no-unpublished-require rule doesn't
    // understand that these files are included via the "files" field, so we
    // disable it for registry/lib. The n/no-missing-require rule still runs
    // and will catch actual missing dependencies.
    files: ['registry/lib/**/*.js', 'registry/lib/**/*.cjs'],
    rules: {
      'n/no-unpublished-require': 'off',
    },
  },
]
