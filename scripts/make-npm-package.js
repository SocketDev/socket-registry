'use strict'

const path = require('node:path')

const { default: confirm } = require('@inquirer/confirm')
const { default: input } = require('@inquirer/input')
const { default: search } = require('@inquirer/search')
const { default: select } = require('@inquirer/select')
const spawn = require('@npmcli/promise-spawn')
const { default: didYouMean, ReturnTypeEnums } = require('didyoumean2')
const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const {
  LICENSE_CONTENT,
  LICENSE_GLOB_PATTERN,
  PACKAGE_JSON,
  execPath,
  npmPackagesPath,
  npmTemplatesPath,
  rootPath,
  runScriptParallelExecPath,
  tsLibs
} = require('@socketregistry/scripts/constants')
const {
  existsInNpmRegistry
} = require('@socketregistry/scripts/utils/packages')
const { naturalSort } = require('@socketregistry/scripts/utils/sorts')

const templates = Object.fromEntries(
  [
    'default',
    'es-shim-prototype-method',
    'es-shim-static-method',
    'node-only',
    'node-plus-browser'
  ].map(k => [k, path.join(npmTemplatesPath, k)])
)

function modifyContent(content, data = {}) {
  let modified = content
  for (const { 0: key, 1: value } of Object.entries(data)) {
    const templateKey = key.replaceAll('-', '_').toUpperCase()
    modified = modified.replaceAll(`%${templateKey}%`, value)
  }
  return modified
}

;(async () => {
  const pkgName = await input({
    message: 'What is the name of the package to override?',
    validate: existsInNpmRegistry
  })
  const templateChoice = await select({
    message: 'Pick a package template to use',
    choices: [
      { name: 'default', value: 'default' },
      {
        name: 'es-shim prototype method',
        value: 'es-shim-prototype-method'
      },
      { name: 'es-shim static method', value: 'es-shim-static-method' },
      { name: 'node only', value: 'node-only' },
      { name: 'node plus browser', value: 'node-plus-browser' }
    ]
  })
  let ts_lib
  if (templateChoice.startsWith('es-shim')) {
    const availableTsLibs = [...tsLibs]
    const maxTsLibLength = availableTsLibs.reduce(
      (n, v) => Math.max(n, v.length),
      0
    )
    if (
      await confirm({
        message: 'Does this override need a TypeScript lib?',
        default: false
      })
    ) {
      ts_lib = await search({
        message: 'Which one?',
        source: async input => {
          if (!input) return []
          // Trim, truncate, and lower input.
          const formatted = input.trim().slice(0, maxTsLibLength).toLowerCase()
          if (!formatted) return []
          let matches
          // Simple search.
          for (const p of ['es2', 'es', 'e', 'de', 'd', 'w']) {
            if (input.startsWith(p) && input.length <= 3) {
              matches = availableTsLibs.filter(l => l.startsWith(p))
              break
            }
          }
          if (matches === undefined) {
            // Advanced closest match search.
            matches = didYouMean(formatted, availableTsLibs, {
              caseSensitive: true,
              deburr: false,
              returnType: ReturnTypeEnums.ALL_CLOSEST_MATCHES,
              threshold: 0.2
            })
          }
          const sorted =
            matches.length > 1
              ? [matches[0], ...naturalSort(matches.slice(1)).desc()]
              : matches
          return sorted.map(l => ({ name: l, value: l }))
        }
      })
    }
  }
  const srcPath = templates[templateChoice]
  const destPath = path.join(npmPackagesPath, pkgName)
  const pkgJsonPath = path.join(destPath, PACKAGE_JSON)

  await fs.copy(srcPath, destPath)

  const actions = []
  const licenseData = {
    license: LICENSE_CONTENT.trim()
  }
  for (const filepath of await tinyGlob([`**/${LICENSE_GLOB_PATTERN}`], {
    absolute: true,
    cwd: destPath
  })) {
    actions.push([filepath, licenseData])
  }
  if (ts_lib) {
    const tsData = {
      ts_lib
    }
    for (const filepath of await tinyGlob(['**/*.ts'], {
      absolute: true,
      cwd: destPath
    })) {
      actions.push([filepath, tsData])
    }
  }
  actions.push([
    pkgJsonPath,
    {
      name: pkgName,
      category: 'cleanup'
    }
  ])
  await Promise.all(
    actions.map(
      async ({ 0: filepath, 1: data }) =>
        await fs.writeFile(
          filepath,
          modifyContent(await fs.readFile(filepath, 'utf8'), {
            ...data
          }),
          'utf8'
        )
    )
  )
  try {
    await spawn(
      execPath,
      [
        runScriptParallelExecPath,
        'update:package-json',
        `update:npm:test-package-json -- --add ${pkgName}`
      ],
      {
        cwd: rootPath,
        stdio: 'inherit'
      }
    )
  } catch (e) {
    console.log('✘ Package override finalization encountered an error:', e)
  }
})()
