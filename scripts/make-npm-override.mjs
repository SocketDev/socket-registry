/**
 * @fileoverview Creates Socket registry package overrides for npm packages.
 * Interactive CLI tool that guides users through creating secure package overrides:
 * - Fetches and extracts the original npm package
 * - Analyzes package structure and licenses
 * - Generates appropriate override templates (CJS, ESM, ES-shim, etc.)
 * - Sets up TypeScript support if needed
 * - Creates README and LICENSE files
 * - Handles browser compatibility and shim requirements
 */

import { existsSync, promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { execScript } from '@socketsecurity/lib/agent'
import { parseArgs } from '@socketsecurity/lib/argv/parse'
import { isDirEmptySync } from '@socketsecurity/lib/fs'
import { globStreamLicenses } from '@socketsecurity/lib/globs'
import { LOG_SYMBOLS, logger } from '@socketsecurity/lib/logger'
import { isObject } from '@socketsecurity/lib/objects'
import {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  extractPackage,
  fetchPackageManifest,
  isSubpathExports,
  isValidPackageName,
  readPackageJson,
  resolveGitHubTgzUrl,
  resolvePackageJsonEntryExports,
  resolvePackageLicenses,
  resolveRegistryPackageName,
} from '@socketsecurity/lib/packages'
import { confirm, input, search, select } from '@socketsecurity/lib/prompts'
import { naturalCompare, naturalSorter } from '@socketsecurity/lib/sorts'
import { transform } from '@socketsecurity/lib/streams'
import { indentString } from '@socketsecurity/lib/strings'
import { pluralize } from '@socketsecurity/lib/words'
import { default as didYouMean, ReturnTypeEnums } from 'didyoumean2'
import fastGlob from 'fast-glob'
import { open } from 'out-url'
import semver from 'semver'

import constants from './constants.mjs'
import {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTemplate,
  getTypeScriptActions,
  writeAction,
} from './utils/templates.mjs'

const require = createRequire(import.meta.url)

const {
  ESNEXT,
  LICENSE,
  LICENSE_ORIGINAL,
  TEMPLATE_CJS,
  TEMPLATE_CJS_BROWSER,
  TEMPLATE_CJS_ESM,
  TEMPLATE_ES_SHIM_CONSTRUCTOR,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  TEMPLATE_ES_SHIM_STATIC_METHOD,
  UTF8,
  npmPackagesPath,
  rootPath,
  tsLibsAvailable,
  tsTypesAvailable,
} = constants

const { positionals: cliPositionals, values: cliArgs } = parseArgs({
  options: {
    force: {
      type: 'boolean',
      short: 'f',
    },
    quiet: {
      type: 'boolean',
    },
  },
  strict: false,
})

const bcaKeysMap = new Map()

const esShimChoices = [
  {
    name: 'es-shim prototype method',
    value: TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  },
  { name: 'es-shim static method', value: TEMPLATE_ES_SHIM_STATIC_METHOD },
  { name: 'es-shim constructor', value: TEMPLATE_ES_SHIM_CONSTRUCTOR },
]

const possibleTsRefs = [...tsLibsAvailable, ...tsTypesAvailable]
const maxTsRefLength = possibleTsRefs.reduce((n, v) => Math.max(n, v.length), 0)

function getBcdKeysMap(obj) {
  let keysMap = bcaKeysMap.get(obj)
  if (keysMap === undefined) {
    keysMap = new Map()
    const keys = Object.keys(obj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      keysMap.set(key.toLowerCase(), key)
    }
    bcaKeysMap.set(obj, keysMap)
  }
  return keysMap
}

function getCompatDataRaw(props) {
  // Defer loading @mdn/browser-compat-data until needed.
  // It's a single 15.3 MB json file.
  const browserCompatData = require('@mdn/browser-compat-data')
  let obj = browserCompatData.default
  for (let i = 0, { length } = props; i < length; i += 1) {
    const rawProp = props[i]
    let prop = rawProp.toLowerCase()
    if (prop === 'prototype') {
      prop = 'proto'
    } else {
      // Trim double underscore property prefix/postfix.
      prop = prop.replace(/^__(?!_)|(?<!_)__$/g, '')
    }
    const keysMap = getBcdKeysMap(obj)
    const newObj = obj[keysMap.get(prop)]
    if (!isObject(newObj)) {
      if (prop === 'proto') {
        continue
      }
      return undefined
    }
    obj = newObj
  }
  return obj
}

function getCompatData(props) {
  const data = getCompatDataRaw(props)
  return data?.__compat
}

async function readLicenses(dirname) {
  const stream = globStreamLicenses(dirname)
  const results = []
  for await (const license of transform(
    stream,
    async filepath => ({
      name: path.basename(filepath),
      content: await fs.readFile(filepath, UTF8),
    }),
    { concurrency: 8 },
  )) {
    results.push(license)
  }
  return results
}

function toChoice(value) {
  return { name: value, value: value }
}

async function main() {
  const origPkgName = await input({
    message: 'What is the name of the package to override?',
    default: cliPositionals.at(0),
    required: true,
    validate: async pkgName =>
      isValidPackageName(pkgName) && !!(await fetchPackageManifest(pkgName)),
  })
  if (origPkgName === undefined) {
    // Exit if user force closed the prompt.
    return
  }
  const sockRegPkgName = resolveRegistryPackageName(origPkgName)
  const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
  if (existsSync(pkgPath) && !isDirEmptySync(pkgPath)) {
    const relPkgPath = path.relative(rootPath, pkgPath)
    logger.warn(`${origPkgName} already exists at ${relPkgPath}`)
    if (
      !(await confirm({
        message: 'Do you want to overwrite it?',
        default: false,
      }))
    ) {
      return
    }
  }
  let badLicenses
  let licenses
  let licenseContents
  let licenseWarnings
  let nmPkgJson
  let relJsFilepaths
  await extractPackage(origPkgName, async nmPkgPath => {
    nmPkgJson = await readPackageJson(nmPkgPath, { normalize: true })
    relJsFilepaths = await fastGlob.glob(['*.js'], {
      ignore: ['**/package.json'],
      cwd: nmPkgPath,
    })
    licenses = resolvePackageLicenses(nmPkgJson.license, nmPkgPath)
    licenseWarnings = collectLicenseWarnings(licenses)
    badLicenses = collectIncompatibleLicenses(licenses)
    if (badLicenses.length === 0) {
      licenseContents = await readLicenses(nmPkgPath)
      if (licenseContents.length === 0) {
        const tgzUrl = await resolveGitHubTgzUrl(origPkgName, nmPkgJson)
        if (tgzUrl) {
          await extractPackage(tgzUrl, async tarDirPath => {
            licenseContents = await readLicenses(tarDirPath)
          })
        }
      }
    }
  })
  if (!nmPkgJson) {
    logger.fail(`Failed to extract ${origPkgName}`)
    return
  }
  if (licenseWarnings.length) {
    const formattedWarnings = licenseWarnings.map(w =>
      indentString(`• ${w}`, { count: 2 }),
    )
    logger.warn(
      `${origPkgName} has license warnings:\n${formattedWarnings.join('\n')}`,
    )
  }
  if (badLicenses.length) {
    const singularOrPlural = pluralize('license', {
      count: badLicenses.length,
    })
    const badLicenseNames = badLicenses.map(n => n.license)
    const warning = `${LOG_SYMBOLS.warn} ${origPkgName} has incompatible ${singularOrPlural} ${badLicenseNames.join(', ')}.`
    const answer = await confirm({
      message: `${warning}.\nDo you want to continue?`,
      default: false,
    })
    if (!answer) {
      if (answer === false) {
        await open(`https://socket.dev/npm/package/${origPkgName}`)
      }
      return
    }
  }
  const isEsm = nmPkgJson.type === 'module'
  const isEsShim =
    relJsFilepaths.includes('auto.js') &&
    relJsFilepaths.includes('implementation.js') &&
    relJsFilepaths.includes('index.js') &&
    relJsFilepaths.includes('polyfill.js') &&
    relJsFilepaths.includes('shim.js')

  let nodeRange
  let templateChoice
  const tsRefs = []
  if (isEsShim) {
    const { maintainedNodeVersions } = constants
    const { PACKAGE_DEFAULT_NODE_RANGE } = constants
    const parts = origPkgName
      .split(/[-.]/)
      .filter(p => p !== 'es' && p !== 'helpers')
    const compatData = getCompatData(['javascript', 'builtins', ...parts])
    const versionAdded =
      compatData?.support?.nodejs?.version_added ?? maintainedNodeVersions.last

    nodeRange = `>=${maintainedNodeVersions.next}`
    if (!semver.satisfies(versionAdded, nodeRange)) {
      nodeRange = `>=${maintainedNodeVersions.current}`
      if (!semver.satisfies(versionAdded, nodeRange)) {
        nodeRange = PACKAGE_DEFAULT_NODE_RANGE
      }
    }
    if (nodeRange !== PACKAGE_DEFAULT_NODE_RANGE) {
      tsRefs.push({ name: 'lib', value: ESNEXT })
    }
    const loweredSpecUrl = compatData?.spec_url?.toLowerCase() ?? ''
    if (
      (parts.length === 3 &&
        (parts[1] === 'prototype' || parts[1] === 'proto')) ||
      loweredSpecUrl.includes(`${parts[0]}.prototype`)
    ) {
      templateChoice = TEMPLATE_ES_SHIM_PROTOTYPE_METHOD
    } else if (
      parts.length === 2 ||
      loweredSpecUrl.includes(`${parts[0]}.${parts.at(-1)}`)
    ) {
      templateChoice = TEMPLATE_ES_SHIM_STATIC_METHOD
    } else if (
      parts.length === 1 ||
      loweredSpecUrl.includes(`${parts[0]}-constructor`)
    ) {
      templateChoice = TEMPLATE_ES_SHIM_CONSTRUCTOR
    } else {
      templateChoice = await select({
        message: 'Pick the es-shim template to use',
        choices: esShimChoices,
      })
    }
  } else if (isEsm) {
    templateChoice = TEMPLATE_CJS_ESM
  } else {
    templateChoice = await select({
      message: 'Pick the package template to use',
      choices: [
        { name: 'cjs', value: TEMPLATE_CJS },
        { name: 'cjs and browser', value: TEMPLATE_CJS_BROWSER },
      ],
    })
  }
  if (templateChoice === undefined) {
    // Exit if user force closed the prompt.
    return
  }
  if (tsRefs.length === 0) {
    const answer = await confirm({
      message: 'Need a TypeScript lib/types reference?',
      default: false,
    })
    if (answer === undefined) {
      // Exit if user force closed the prompt.
      return
    }
    if (answer) {
      const searchResult = await search({
        message: 'Which one?',
        source: async input => {
          if (!input) {
            return []
          }
          // Trim, truncate, and lower input.
          const formatted = input.trim().slice(0, maxTsRefLength).toLowerCase()
          if (!formatted) {
            return [input]
          }
          let matches
          // Simple search.
          for (const p of ['es2', 'es', 'e', 'de', 'd', 'n', 'w']) {
            if (input.startsWith(p) && input.length <= 3) {
              matches = possibleTsRefs.filter(l => l.startsWith(p))
              break
            }
          }
          if (matches === undefined) {
            // Advanced closest match search.
            matches = didYouMean(formatted, possibleTsRefs, {
              caseSensitive: true,
              deburr: false,
              returnType: ReturnTypeEnums.ALL_CLOSEST_MATCHES,
              threshold: 0.2,
            })
          }
          if (matches.length === 0) {
            return [toChoice(input)]
          }
          const firstMatch = matches[0]
          const sortedTail =
            matches.length > 1 ? naturalSorter(matches.slice(1)).desc() : []
          // If a match starts with input then don't include input in the results.
          if (matches.some(m => m.startsWith(input))) {
            return [firstMatch, ...sortedTail].map(toChoice)
          }
          let first = firstMatch
          let second = input
          if (input.length > firstMatch.length) {
            first = input
            second = firstMatch
          }
          return [first, second, ...sortedTail].map(toChoice)
        },
      })
      if (searchResult === undefined) {
        // Exit if user force closed the prompt.
        return
      }
      const name = tsLibsAvailable.has(searchResult) ? 'lib' : 'types'
      tsRefs.push({ name, value: searchResult })
    }
  }

  const templatePkgPath = getTemplate(templateChoice)

  const interop = [
    'cjs',
    ...(TEMPLATE_CJS_ESM ? ['esm'] : []),
    ...(TEMPLATE_CJS_BROWSER ? ['browserify'] : []),
  ]

  // First copy the template directory contents to the package path.
  await fs.cp(templatePkgPath, pkgPath, { recursive: true })
  // Then modify the new package's package.json source and write to disk.
  await writeAction(
    await getPackageJsonAction(pkgPath, {
      engines: {
        node: nodeRange ?? constants.PACKAGE_DEFAULT_NODE_RANGE,
      },
    }),
  )
  // Finally, modify other package file sources and write to disk.
  await Promise.all(
    [
      await getNpmReadmeAction(pkgPath, { interop }),
      ...(await getLicenseActions(pkgPath)),
      ...(await getTypeScriptActions(pkgPath, {
        transform(filepath, data) {
          // Exclude /// <reference types="node" /> from .d.ts files, allowing
          // them in .d.cts files.
          const isCts = filepath.endsWith('.d.cts')
          data.references = tsRefs.filter(
            r => isCts || !(r.name === 'types' && r.value === 'node'),
          )
          return data
        },
      })),
    ].map(writeAction),
  )
  // Create LICENSE.original files.
  const { length: licenseCount } = licenseContents
  const filesFieldAdditions = []
  for (let i = 0; i < licenseCount; i += 1) {
    const { content, name } = licenseContents[i]
    const extRaw = path.extname(name)
    // Omit the .txt extension since licenses are assumed plain text by default.
    const ext = extRaw === '.txt' ? '' : extRaw
    const basename = licenseCount === 1 ? LICENSE : path.basename(name, ext)
    const originalLicenseName = `${basename}.original${ext}`
    if (
      // `npm pack` will automatically include LICENSE{.*,} files so we can
      // exclude them from the package.json "files" field.
      originalLicenseName !== LICENSE_ORIGINAL &&
      originalLicenseName !== `${LICENSE_ORIGINAL}.md`
    ) {
      filesFieldAdditions.push(originalLicenseName)
    }

    await fs.writeFile(path.join(pkgPath, originalLicenseName), content, UTF8)
  }
  if (filesFieldAdditions.length) {
    // Load the freshly written package.json and edit its "exports" and "files" fields.
    const editablePkgJson = await readPackageJson(pkgPath, {
      editable: true,
      normalize: true,
    })
    const entryExports = resolvePackageJsonEntryExports(
      editablePkgJson.content.exports,
    )
    const nmEntryExports = resolvePackageJsonEntryExports(nmPkgJson.exports)
    const useNmEntryExports =
      entryExports === undefined && isSubpathExports(nmEntryExports)
    editablePkgJson.update({
      main: useNmEntryExports ? undefined : editablePkgJson.content.main,
      exports: useNmEntryExports ? nmEntryExports : entryExports,
      files: [...editablePkgJson.content.files, ...filesFieldAdditions].sort(
        naturalCompare,
      ),
    })
    await editablePkgJson.save()
  }

  // Update monorepo package.json workspaces definition and test/npm files.
  try {
    const spawnOptions = {
      cwd: rootPath,
      stdio: 'inherit',
    }
    await execScript('update:manifest', [], spawnOptions)
    await execScript('update:package-json', [], spawnOptions)
    if (!cliArgs.quiet) {
      logger.log('Finished 🎉')
    }
  } catch (e) {
    logger.fail('Package override finalization encountered an error:')
    logger.error(e)
  }
}

main().catch(console.error)
