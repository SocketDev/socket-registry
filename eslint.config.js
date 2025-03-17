'use strict'

const path = require('node:path')

const { convertIgnorePatternToMinimatch } = require('@eslint/compat')
const js = require('@eslint/js')
const { createOxcImportResolver } = require('eslint-import-resolver-oxc')
const importXPlugin = require('eslint-plugin-import-x')
const nodePlugin = require('eslint-plugin-n')
const sortDestructureKeysPlugin = require('eslint-plugin-sort-destructure-keys')
const unicornPlugin = require('eslint-plugin-unicorn')
const globals = require('globals')
const { globSync } = require('tinyglobby')
const tsEslint = require('typescript-eslint')

const constants = require('@socketregistry/scripts/constants')
const { readPackageJsonSync } = require('@socketsecurity/registry/lib/packages')

const {
  BIOME_JSON,
  LATEST,
  gitIgnoreFile,
  npmPackagesPath,
  relNpmPackagesPath,
  rootTsConfigPath
} = constants

const { flatConfigs: origImportXFlatConfigs } = importXPlugin

const rootPath = __dirname

const biomeConfigPath = path.join(rootPath, BIOME_JSON)

const biomeConfig = require(biomeConfigPath)
const nodeGlobalsConfig = Object.fromEntries(
  Object.entries(globals.node).map(([k]) => [k, 'readonly'])
)

const sharedPlugins = {
  'sort-destructure-keys': sortDestructureKeysPlugin,
  unicorn: unicornPlugin
}

const sharedRules = {
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
      varsIgnorePattern: '^_'
    }
  ],
  'no-var': 'error',
  'no-warning-comments': 'error',
  'prefer-const': 'error',
  'sort-destructure-keys/sort-destructure-keys': 'error',
  'sort-imports': ['error', { ignoreDeclarationSort: true }],
  'unicorn/consistent-function-scoping': 'error'
}

const sharedRulesForImportX = {
  ...origImportXFlatConfigs.recommended.rules,
  'import-x/extensions': [
    'error',
    'never',
    {
      cjs: 'ignorePackages',
      js: 'ignorePackages',
      json: 'always',
      mjs: 'ignorePackages'
    }
  ],
  'import-x/order': [
    'warn',
    {
      groups: [
        'builtin',
        'external',
        'internal',
        ['parent', 'sibling', 'index'],
        'type'
      ],
      pathGroups: [
        {
          pattern: '@socket{registry,security}/**',
          group: 'internal'
        }
      ],
      pathGroupsExcludedImportTypes: ['type'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc'
      }
    }
  ]
}

function getIgnores(isEsm) {
  // Lazily access constants.npmPackageNames.
  return constants.npmPackageNames.flatMap(sockRegPkgName => {
    const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
    const { type } = readPackageJsonSync(pkgPath)
    const ignored = []
    if (isEsm ? type !== 'module' : type === 'module') {
      ignored.push(`${relNpmPackagesPath}/${sockRegPkgName}/*`)
    } else if (!isEsm) {
      ignored.push(`${relNpmPackagesPath}/${sockRegPkgName}/*.mjs`)
      if (
        globSync(['**/*.cjs'], {
          cwd: pkgPath,
          // Lazily access constants.ignoreGlobs.
          ignores: constants.ignoreGlobs
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
        ecmaVersion: LATEST,
        sourceType: isEsm ? 'module' : 'script'
      }
    },
    typescript: {
      ...origImportXFlatConfigs.typescript,
      plugins: {
        ...origImportXFlatConfigs.recommended.plugins,
        ...origImportXFlatConfigs.typescript.plugins
      },
      settings: {
        ...origImportXFlatConfigs.typescript.settings,
        'import-x/resolver-next': [
          createOxcImportResolver({
            tsConfig: {
              configFile: rootTsConfigPath,
              references: 'auto'
            }
          })
        ]
      },
      rules: {
        ...sharedRulesForImportX,
        // TypeScript compilation already ensures that named imports exist in
        // the referenced module.
        'import-x/named': 'off',
        'import-x/no-named-as-default-member': 'off',
        'import-x/no-unresolved': 'off'
      }
    }
  }
}

function configs(sourceType) {
  const isEsm = sourceType === 'module'
  const ignores = getIgnores(isEsm)
  const importFlatConfigs = getImportXFlatConfigs(isEsm)
  const nodePluginConfigs =
    nodePlugin.configs[`flat/recommended-${isEsm ? 'module' : 'script'}`]
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
          ...nodeGlobalsConfig
        },
        sourceType: isEsm ? 'module' : 'script'
      },
      plugins: {
        ...js.configs.recommended.plugins,
        ...importFlatConfigs.recommended.plugins,
        ...nodePluginConfigs.plugins,
        ...sharedPlugins
      },
      rules: {
        ...js.configs.recommended.rules,
        ...importFlatConfigs.recommended.rules,
        ...nodePluginConfigs.rules,
        ...sharedRules,
        'n/exports-style': ['error', 'module.exports'],
        // The n/no-unpublished-bin rule does does not support non-trivial glob
        // patterns used in package.json "files" fields. In those cases we simplify
        // the glob patterns used.
        'n/no-unpublished-bin': 'error',
        'n/no-unsupported-features/es-builtins': [
          'error',
          {
            ignores: ['Object.groupBy'],
            // Lazily access constants.maintainedNodeVersions.
            version: constants.maintainedNodeVersions.current
          }
        ],
        'n/no-unsupported-features/es-syntax': [
          'error',
          {
            ignores: ['object-map-groupby'],
            // Lazily access constants.maintainedNodeVersions.
            version: constants.maintainedNodeVersions.current
          }
        ],
        'n/no-unsupported-features/node-builtins': [
          'error',
          {
            ignores: ['buffer.resolveObjectURL', 'fetch', 'fs.promises.cp'],
            // Lazily access constants.maintainedNodeVersions.
            version: constants.maintainedNodeVersions.current
          }
        ],
        'n/prefer-node-protocol': 'error'
      }
    },
    {
      files: ['**/*.{cts,mts,ts}'],
      ...js.configs.recommended,
      ...importFlatConfigs.typescript,
      ignores,
      languageOptions: {
        ...js.configs.recommended.languageOptions,
        ...importFlatConfigs.typescript.languageOptions,
        ecmaVersion: LATEST,
        sourceType,
        parser: tsEslint.parser,
        parserOptions: {
          ...importFlatConfigs.typescript.languageOptions?.parserOptions,
          projectService: {
            ...importFlatConfigs.typescript.languageOptions?.parserOptions
              ?.projectService,
            allowDefaultProject: [
              'packages/*/*/*.d.{cts,mts}',
              'vitest.config.mts'
            ],
            defaultProject: 'tsconfig.json',
            // Need this to glob packages/npm/* files.
            maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 1_000,
            tsconfigRootDir: __dirname
          }
        }
      },
      plugins: {
        ...js.configs.recommended.plugins,
        ...importFlatConfigs.typescript.plugins,
        ...sharedPlugins,
        '@typescript-eslint': tsEslint.plugin
      },
      rules: {
        ...js.configs.recommended.rules,
        ...importFlatConfigs.typescript.rules,
        ...sharedRules,
        '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
        '@typescript-eslint/consistent-type-assertions': [
          'error',
          { assertionStyle: 'as' }
        ],
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/no-misused-new': 'error',
        '@typescript-eslint/no-this-alias': [
          'error',
          { allowDestructuring: true }
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
        'no-unused-vars': 'off'
      }
    },
    {
      files: ['**/*.d.{cts,mts,ts}'],
      ignores,
      rules: {
        // Disable the following rules because they don't play well with TypeScript
        // definition files.
        'n/no-missing-import': 'off'
      }
    }
  ]
}

module.exports = [
  gitIgnoreFile,
  {
    name: 'Imported biome.json ignore patterns',
    ignores: biomeConfig.files.ignore.map(convertIgnorePatternToMinimatch)
  },
  {
    ignores: ['packages/npm/**/package']
  },
  ...configs('script'),
  ...configs('module')
]
