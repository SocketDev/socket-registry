'use strict'

const path = require('node:path')

const js = require('@eslint/js')
const importXPlugin = require('eslint-plugin-import-x')
const nodePlugin = require('eslint-plugin-n')
const sortDestructureKeysPlugin = require('eslint-plugin-sort-destructure-keys')
const fs = require('fs-extra')
const tsEslint = require('typescript-eslint')

const constants = require('@socketregistry/scripts/constants')
const {
  PACKAGE_JSON,
  gitIgnoreFile,
  npmPackagesPath,
  prettierIgnoreFile,
  relNpmPackagesPath,
  rootTsConfigPath
} = constants

const {
  engines: { node: nodeRange }
} = require('./package.json')

const { flatConfigs: origImportXFlatConfigs } = importXPlugin

const conditionalConfig = (config, isEsm) => {
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

const getIgnores = isEsm =>
  // Lazily access constants.npmPackageNames.
  constants.npmPackageNames.flatMap(regPkgName => {
    const pkgPath = path.join(npmPackagesPath, regPkgName)
    const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
    let shouldIgnore = false
    try {
      const { type } = fs.readJsonSync(pkgJsonPath)
      shouldIgnore = isEsm ? type !== 'module' : type === 'module'
    } catch {}
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

const getImportXFlatConfigs = isEsm => ({
  recommended: {
    ...origImportXFlatConfigs.recommended,
    languageOptions: {
      ...origImportXFlatConfigs.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: isEsm ? 'module' : 'script'
    },
    rules: {
      ...origImportXFlatConfigs.recommended.rules,
      'import-x/no-named-as-default-member': 'off',
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
              pattern: '@socketregistry/**',
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
  },
  typescript: {
    ...origImportXFlatConfigs.typescript,
    settings: {
      ...origImportXFlatConfigs.typescript.settings,
      'import-x/resolver': {
        'eslint-import-resolver-oxc': {
          tsConfig: {
            configFile: rootTsConfigPath,
            references: 'auto'
          }
        }
      }
    }
  }
})

function configs(sourceType) {
  const isEsm = sourceType === 'module'
  const ignores = getIgnores(isEsm)
  const importFlatConfigs = getImportXFlatConfigs(isEsm)
  return [
    {
      ignores,
      ...nodePlugin.configs['flat/recommended-script']
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
      ignores,
      plugins: {
        'sort-destructure-keys': sortDestructureKeysPlugin
      },
      rules: {
        'n/exports-style': ['error', 'module.exports'],
        // The n/no-unpublished-bin rule does does not support non-trivial glob
        // patterns used in package.json "files" fields. In those cases we simplify
        // the glob patterns used.
        'n/no-unpublished-bin': ['error'],
        'n/no-unsupported-features/es-builtins': [
          'error',
          {
            ignores: ['Object.groupBy'],
            version: nodeRange
          }
        ],
        'n/no-unsupported-features/es-syntax': [
          'error',
          {
            ignores: ['object-map-groupby'],
            version: nodeRange
          }
        ],
        'n/no-unsupported-features/node-builtins': [
          'error',
          {
            ignores: [
              'buffer.resolveObjectURL',
              'module.enableCompileCache',
              'fetch'
            ],
            version: nodeRange
          }
        ],
        'n/prefer-node-protocol': ['error'],
        'no-empty': ['error', { allowEmptyCatch: true }],
        'no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_|^this$', ignoreRestSiblings: true }
        ],
        'no-self-assign': ['error', { props: false }],
        'no-warning-comments': ['error'],
        'sort-destructure-keys/sort-destructure-keys': ['error'],
        'sort-imports': ['error', { ignoreDeclarationSort: true }]
      }
    },
    ...conditionalConfig(
      {
        files: [`${relNpmPackagesPath}/**/*.ts`, 'test/**/*.ts'],
        ignores,
        languageOptions: {
          ecmaVersion: 'latest',
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
          '@typescript-eslint': tsEslint.plugin
        },
        linterOptions: {
          reportUnusedDisableDirectives: 'off'
        },
        rules: {
          '@typescript-eslint/no-floating-promises': ['error'],
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
        files: [`${relNpmPackagesPath}/**/*.js`, 'scripts/**/*.js'],
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
