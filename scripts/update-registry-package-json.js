'use strict'

const path = require('node:path')

const { glob } = require('fast-glob')

const builtinNames = require('@socketregistry/packageurl-js/data/npm/builtin-names.json')
const constants = require('@socketregistry/scripts/constants')
const { toSortedObject } = require('@socketsecurity/registry/lib/objects')
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')

void (async () => {
  const registryEditablePkgJson = await readPackageJson(
    // Lazily access constants.registryPkgPath.
    constants.registryPkgPath,
    {
      editable: true,
      normalize: true
    }
  )
  const { content: registryPkgJson } = registryEditablePkgJson

  const browser = { ...registryPkgJson.browser }
  for (const builtinName of builtinNames) {
    browser[builtinName] = false
  }

  const registryPkgFiles = await glob(['**/*.{cjs,js,json,d.ts}'], {
    // Lazily access constants.registryPkgPath.
    cwd: constants.registryPkgPath,
    ignore: [
      // Lazily access constants.ignoreGlobs.
      ...constants.ignoreGlobs,
      'external/**',
      'scripts/**',
      'src/**'
    ]
  })

  const subpathExports = registryPkgFiles.reduce((o, p) => {
    const ext = p.endsWith('.d.ts') ? '.d.ts' : path.extname(p)
    if (ext === '.json') {
      o[`./${p}`] = `./${p}`
    } else {
      const extLessPath = `./${p.slice(0, -ext.length)}`
      const isDts = ext === '.d.ts'
      if (o[extLessPath]) {
        o[extLessPath][isDts ? 'types' : 'default'] = `./${p}`
      } else {
        o[extLessPath] = {
          // Order is significant. Default should be specified last.
          types: isDts ? `./${p}` : undefined,
          default: isDts ? undefined : `./${p}`
        }
      }
      const basename = path.basename(p, ext)
      if (basename === 'index') {
        const dirname = path.dirname(p)
        const dirPath = dirname === '.' ? dirname : `./${path.dirname(p)}`
        if (o[dirPath]) {
          o[dirPath][isDts ? 'types' : 'default'] = `./${p}`
        } else {
          o[dirPath] = {
            // Order is significant. Default should be specified last.
            types: isDts ? `./${p}` : undefined,
            default: isDts ? undefined : `./${p}`
          }
        }
      }
    }
    return o
  }, {})

  registryEditablePkgJson.update({
    browser: toSortedObject(browser),
    exports: toSortedObject(subpathExports),
    // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
    engines: { node: constants.PACKAGE_DEFAULT_NODE_RANGE }
  })
  await registryEditablePkgJson.save()
})()
