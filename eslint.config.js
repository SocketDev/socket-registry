'use strict'

const path = require('node:path')

const js = require('@eslint/js')
const { createOxcImportResolver } = require('eslint-import-resolver-oxc')
const importXPlugin = require('eslint-plugin-import-x')
const nodePlugin = require('eslint-plugin-n')
const sortDestructureKeysPlugin = require('eslint-plugin-sort-destructure-keys')
const unicornPlugin = require('eslint-plugin-unicorn')
const tsEslint = require('typescript-eslint')

const constants = require('@socketregistry/scripts/constants')
const {
  LATEST,
  PACKAGE_JSON,
  gitIgnoreFile,
  npmPackagesPath,
  prettierIgnoreFile,
  relNpmPackagesPath,
  relRegistryPkgPath,
  rootTsConfigPath
} = constants
const { readJsonSync } = require('@socketsecurity/registry/lib/fs')

const { flatConfigs: origImportXFlatConfigs } = importXPlugin

const sharedPlugins = {
  'sort-destructure-keys': sortDestructureKeysPlugin,
  unicorn: unicornPlugin
}

const sharedRules = {
  'no-await-in-loop': ['error'],
  'no-control-regex': ['error'],
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-new': ['error'],
  'no-proto': ['error'],
  'no-warning-comments': ['warn', { terms: ['fixme'] }],
  'sort-destructure-keys/sort-destructure-keys': ['error'],
  'sort-imports': ['error', { ignoreDeclarationSort: true }],
  'unicorn/consistent-function-scoping': ['error']
}

const sharedRulesForImportX = {
  ...origImportXFlatConfigs.recommended.rules,
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

function conditionalConfig(config, isEsm) {
  const files = Array.isArray(config.files)
    ? isEsm
      ? config.files.filter(p => p.startsWith(relNpmPackagesPath))
      : config.files
    : undefined
  return files?.length
    ? [
        {
          ...config,
          files
        }
      ]
    : []
}

function getIgnores(isEsm) {
  // Lazily access constants.npmPackageNames.
  return constants.npmPackageNames.flatMap(regPkgName => {
    const pkgPath = path.join(npmPackagesPath, regPkgName)
    const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
    const { type } = readJsonSync(pkgJsonPath)
    const shouldIgnore = isEsm ? type !== 'module' : type === 'module'
    const ignored = []
    if (shouldIgnore) {
      ignored.push(`${relNpmPackagesPath}/${regPkgName}/*`)
    } else if (isEsm) {
      ignored.push(`${relNpmPackagesPath}/${regPkgName}/index.js`)
    } else {
      ignored.push(`${relNpmPackagesPath}/${regPkgName}/*.mjs`)
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
      },
      rules: {
        ...sharedRulesForImportX,
        'import-x/no-named-as-default-member': 'off'
      }
    },
    typescript: {
      ...origImportXFlatConfigs.typescript,
      plugins: origImportXFlatConfigs.recommended.plugins,
      settings: {
        ...origImportXFlatConfigs.typescript.settings,
        ...sharedRulesForImportX,
        'import-x/resolver-next': [
          createOxcImportResolver({
            tsConfig: {
              configFile: rootTsConfigPath,
              references: 'auto'
            }
          })
        ]
      }
    }
  }
}

function configs(sourceType) {
  const isEsm = sourceType === 'module'
  const ignores = getIgnores(isEsm)
  const importFlatConfigs = getImportXFlatConfigs(isEsm)
  return [
    {
      ignores,
      ...nodePlugin.configs['flat/recommended-script'],
      rules: {
        ...nodePlugin.configs['flat/recommended-script'].rules,
        'n/exports-style': ['error', 'module.exports'],
        // The n/no-unpublished-bin rule does does not support non-trivial glob
        // patterns used in package.json "files" fields. In those cases we simplify
        // the glob patterns used.
        'n/no-unpublished-bin': ['error'],
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
        'n/prefer-node-protocol': ['error']
      }
    },
    {
      ignores,
      ...importFlatConfigs.recommended
    },
    {
      ignores,
      ...importFlatConfigs.typescript
    },
    {
      files: [
        `${relNpmPackagesPath}/**/*.{c,}js`,
        `${relRegistryPkgPath}/**/*.{c,}js`,
        'scripts/**/*.{c,}js',
        'test/**/*.{c,}js'
      ],
      ignores,
      linterOptions: {
        reportUnusedDisableDirectives: 'off'
      },
      plugins: {
        ...sharedPlugins
      },
      rules: {
        ...js.configs.recommended.rules,
        ...sharedRules,
        'no-self-assign': ['error', { props: false }],
        'no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_|^this$', ignoreRestSiblings: true }
        ],
        'no-warning-comments': ['error']
      }
    },
    ...conditionalConfig(
      {
        files: [`${relNpmPackagesPath}/**/*.ts`, 'test/**/*.ts'],
        ignores,
        languageOptions: {
          ecmaVersion: LATEST,
          sourceType,
          parser: tsEslint.parser,
          parserOptions: {
            projectService: {
              allowDefaultProject: [],
              defaultProject: 'tsconfig.json',
              tsconfigRootDir: __dirname
            }
          }
        },
        plugins: {
          ...sharedPlugins,
          '@typescript-eslint': tsEslint.plugin
        },
        rules: {
          ...sharedRules,
          // Define @typescript-eslint/no-extraneous-class because oxlint defines
          // "no-extraneous-class": ["deny"] and trying to eslint-disable it will
          // cause an eslint "Definition not found" error otherwise.
          '@typescript-eslint/no-extraneous-class': ['error'],
          '@typescript-eslint/no-floating-promises': ['error'],
          // Define @typescript-eslint/no-misused-new because oxlint defines
          // "no-misused-new": ["deny"] and trying to eslint-disable it will
          // cause an eslint "Definition not found" error otherwise.
          '@typescript-eslint/no-misused-new': ['error'],
          '@typescript-eslint/no-misused-promises': ['error'],
          // Define @typescript-eslint/no-this-alias because oxlint defines
          // "no-this-alias": ["deny"] and trying to eslint-disable it will
          // cause an eslint "Definition not found" error otherwise.
          '@typescript-eslint/no-this-alias': ['error'],
          // Returning unawaited promises in a try/catch/finally is dangerous
          // (the `catch` won't catch if the promise is rejected, and the `finally`
          // won't wait for the promise to resolve). Returning unawaited promises
          // elsewhere is probably fine, but this lint rule doesn't have a way
          // to only apply to try/catch/finally (the 'in-try-catch' option *enforces*
          // not awaiting promises *outside* of try/catch/finally, which is not what
          // we want), and it's nice to await before returning anyways, since you get
          // a slightly more comprehensive stack trace upon promise rejection.
          '@typescript-eslint/return-await': ['error', 'always']
        }
      },
      isEsm
    ),
    ...conditionalConfig(
      {
        files: ['test/**/*.ts'],
        ignores,
        rules: {
          '@typescript-eslint/no-floating-promises': 'off'
        }
      },
      isEsm
    ),
    ...conditionalConfig(
      {
        files: [`${relNpmPackagesPath}/**/*.d.ts`, 'test/**/*.d.ts'],
        ignores,
        rules: {
          'no-unused-vars': 'off'
        }
      },
      isEsm
    ),
    ...conditionalConfig(
      {
        files: [
          `${relNpmPackagesPath}/**/*.{c,}js`,
          `${relRegistryPkgPath}/**/*.{c,}js`,
          'scripts/**/*.{c,}js',
          'test/**/*.{c,}js'
        ],
        ignores,
        rules: {
          ...js.configs.recommended.rules
        }
      },
      isEsm
    )
  ]
}

module.exports = [
  gitIgnoreFile,
  prettierIgnoreFile,
  ...configs('script'),
  ...configs('module')
]
