import { createRequire } from 'node:module'
import path from 'node:path'

import constants from './constants.mjs'

const require = createRequire(import.meta.url)
const { glob } = require('fast-glob')
const builtinNames = require('@socketregistry/packageurl-js/data/npm/builtin-names.json')
const { toSortedObject } = require('@socketsecurity/registry/lib/objects')
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')

const { EXT_DTS, EXT_JSON } = constants

void (async () => {
  const { registryPkgPath } = constants

  const registryEditablePkgJson = await readPackageJson(registryPkgPath, {
    editable: true,
    normalize: true,
  })

  const registryPkgJson = registryEditablePkgJson.content

  const browser = { ...registryPkgJson.browser }
  for (const builtinName of builtinNames) {
    browser[builtinName] = false
  }

  const registryPkgFiles = [
    ...(await glob(['**/*.{cjs,js,json,d.ts}'], {
      cwd: registryPkgPath,
      ignore: [...constants.ignoreGlobs, 'external/**', 'scripts/**', 'src/**'],
    })),
  ]

  const subpathExports = registryPkgFiles.reduce((o, p) => {
    const ext = p.endsWith(EXT_DTS) ? EXT_DTS : path.extname(p)
    if (ext === EXT_JSON) {
      o[`./${p}`] = `./${p}`
    } else {
      const extLessPath = `./${p.slice(0, -ext.length)}`
      const isDts = ext === EXT_DTS
      if (o[extLessPath]) {
        o[extLessPath][isDts ? 'types' : 'default'] = `./${p}`
      } else {
        o[extLessPath] = {
          // Order is significant. Default should be specified last.
          types: isDts ? `./${p}` : undefined,
          default: isDts ? undefined : `./${p}`,
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
            default: isDts ? undefined : `./${p}`,
          }
        }
      }
    }
    return o
  }, {})

  registryEditablePkgJson.update({
    browser: toSortedObject(browser),
    exports: toSortedObject(subpathExports),
    engines: { node: constants.PACKAGE_DEFAULT_NODE_RANGE },
  })
  await registryEditablePkgJson.save()
})()
