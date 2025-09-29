import path from 'node:path'

import constants from './constants.mjs'

import fastGlob from 'fast-glob'
import builtinNames from '@socketregistry/packageurl-js/data/npm/builtin-names.json' with {
  type: 'json',
}
import { toSortedObject } from '../registry/dist/lib/objects.js'
import { readPackageJson } from '../registry/dist/lib/packages.js'

const { EXT_DTS, EXT_JSON } = constants

async function main() {
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
    ...(await fastGlob.glob(['**/*.{cjs,js,json,d.ts}'], {
      cwd: registryPkgPath,
      ignore: [...constants.ignoreGlobs, 'external/**', 'scripts/**', 'src/**'],
    })),
  ]

  console.log('Found', registryPkgFiles.length, 'files')
  console.log('First 10:', registryPkgFiles.slice(0, 10))

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

  // Add additional mappings for constants with uppercase names.
  // Map both lowercase-hyphenated and UPPERCASE_UNDERSCORE paths to the same files.
  for (const [exportPath, exportValue] of Object.entries(subpathExports)) {
    if (
      exportPath.startsWith('./lib/constants/') &&
      exportPath !== './lib/constants'
    ) {
      const pathAfterConstants = exportPath.slice('./lib/constants/'.length)

      // Check if this looks like a lowercase-hyphenated name.
      if (
        pathAfterConstants.includes('-') &&
        pathAfterConstants === pathAfterConstants.toLowerCase()
      ) {
        // Convert to UPPERCASE_UNDERSCORE.
        const uppercasePath = `./lib/constants/${pathAfterConstants.toUpperCase().replace(/-/g, '_')}`
        if (!subpathExports[uppercasePath]) {
          subpathExports[uppercasePath] = exportValue
        }
      }

      // Check if this looks like an UPPERCASE_UNDERSCORE name.
      if (
        pathAfterConstants.includes('_') &&
        /[A-Z]/.test(pathAfterConstants)
      ) {
        // Convert to lowercase-hyphenated.
        const lowercasePath = `./lib/constants/${pathAfterConstants.toLowerCase().replace(/_/g, '-')}`
        if (!subpathExports[lowercasePath]) {
          subpathExports[lowercasePath] = exportValue
        }
      }
    }
  }

  registryEditablePkgJson.update({
    browser: toSortedObject(browser),
    exports: toSortedObject(subpathExports),
    engines: { node: constants.PACKAGE_DEFAULT_NODE_RANGE },
  })
  await registryEditablePkgJson.save()
}

main().catch(console.error)
