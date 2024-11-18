'use strict'

const { existsSync, promises: fs } = require('node:fs')
const path = require('node:path')
const util = require('node:util')

const { ReturnTypeEnums, default: didYouMean } = require('didyoumean2')
const { open } = require('out-url')
const semver = require('semver')
const { glob: tinyGlob } = require('tinyglobby')

const constants = require('@socketregistry/scripts/constants')
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
  npmPackagesPath,
  parseArgsConfig,
  rootPath,
  tsLibsAvailable,
  tsTypesAvailable
} = constants
const {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTypeScriptActions,
  templates,
  writeAction
} = require('@socketregistry/scripts/lib/templates')
const { isDirEmptySync } = require('@socketsecurity/registry/lib/fs')
const { globLicenses } = require('@socketsecurity/registry/lib/globs')
const { runScript } = require('@socketsecurity/registry/lib/npm')
const { isObject } = require('@socketsecurity/registry/lib/objects')
const {
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
  resolveRegistryPackageName
} = require('@socketsecurity/registry/lib/packages')
const {
  confirm,
  input,
  search,
  select
} = require('@socketsecurity/registry/lib/prompts')
const {
  localeCompare,
  naturalSort
} = require('@socketsecurity/registry/lib/sorts')
const { indentString } = require('@socketsecurity/registry/lib/strings')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const { positionals: cliPositionals, values: cliArgs } =
  util.parseArgs(parseArgsConfig)

const bcaKeysMap = new Map()

const esShimChoices = [
  {
    name: 'es-shim prototype method',
    value: TEMPLATE_ES_SHIM_PROTOTYPE_METHOD
  },
  { name: 'es-shim static method', value: TEMPLATE_ES_SHIM_STATIC_METHOD },
  { name: 'es-shim constructor', value: TEMPLATE_ES_SHIM_CONSTRUCTOR }
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
  let obj = require('@mdn/browser-compat-data')
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
  return getCompatDataRaw(props)?.__compat
}

async function readLicenses(dirname) {
  return await Promise.all(
    (await globLicenses(dirname)).map(async p => ({
      name: path.basename(p),
      content: await fs.readFile(p, 'utf8')
    }))
  )
}

function toChoice(value) {
  return { name: value, value: value }
}

const abortController = new AbortController()
const { signal } = abortController

// Detect ^C, i.e. Ctrl + C.
process.on('SIGINT', () => {
  console.log('SIGINT signal received: Exiting gracefully...')
  abortController.abort()
})
void (async () => {
  const origPkgName = await input({
    message: 'What is the name of the package to override?',
    default: cliPositionals.at(0),
    required: true,
    validate: async pkgName =>
      isValidPackageName(pkgName) && !!(await fetchPackageManifest(pkgName))
  })
  if (origPkgName === undefined) {
    // Exit if user force closed the prompt.
    return
  }
  const regPkgName = resolveRegistryPackageName(origPkgName)
  const pkgPath = path.join(npmPackagesPath, regPkgName)
  if (existsSync(pkgPath) && !isDirEmptySync(pkgPath)) {
    const relPkgPath = path.relative(rootPath, pkgPath)
    console.log(`⚠️ ${origPkgName} already exists at ${relPkgPath}`)
    if (
      !(await confirm({
        message: 'Do you want to overwrite it?',
        default: false
      }))
    ) {
      return
    }
  }
  let badLicenses
  let jsFiles
  let licenses
  let licenseContents
  let licenseWarnings
  let nmPkgJson
  await extractPackage(origPkgName, async nmPkgPath => {
    nmPkgJson = await readPackageJson(nmPkgPath)
    jsFiles = await tinyGlob(['**/*.{cjs,js,json}'], {
      ignore: ['**/package.json'],
      cwd: nmPkgPath
    })
    licenses = resolvePackageLicenses(nmPkgJson.license, nmPkgPath)
    licenseWarnings = collectLicenseWarnings(licenses)
    badLicenses = collectIncompatibleLicenses(licenses)
    if (badLicenses.length === 0) {
      licenseContents = await readLicenses(nmPkgPath)
      if (licenseContents.length === 0) {
        const tgzUrl = await resolveGitHubTgzUrl(origPkgName, nmPkgJson)
        if (tgzUrl) {
          extractPackage(tgzUrl, async tarDirPath => {
            licenseContents = await readLicenses(tarDirPath)
          })
        }
      }
    }
  })
  if (!nmPkgJson) {
    console.log(`✖️ Failed to extract ${origPkgName}`)
    return
  }
  if (licenseWarnings.length) {
    const formattedWarnings = licenseWarnings.map(w =>
      indentString(`• ${w}`, 2)
    )
    console.log(
      `⚠️ ${origPkgName} has license warnings:\n${formattedWarnings.join('\n')}`
    )
  }
  if (badLicenses.length) {
    const singularOrPlural = pluralize('license', badLicenses.length)
    const badLicenseNames = badLicenses.map(n => n.license)
    const warning = `⚠️ ${origPkgName} has incompatible ${singularOrPlural} ${badLicenseNames.join(', ')}.`
    const answer = await confirm({
      message: `${warning}.\nDo you want to continue?`,
      default: false
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
    jsFiles.includes('auto.js') &&
    jsFiles.includes('implementation.js') &&
    jsFiles.includes('index.js') &&
    jsFiles.includes('polyfill.js') &&
    jsFiles.includes('shim.js.js')

  let nodeRange
  let templateChoice
  const tsRefs = []
  if (isEsShim) {
    // Lazily access constants.maintainedNodeVersions.
    const { maintainedNodeVersions } = constants
    // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
    const { PACKAGE_DEFAULT_NODE_RANGE } = constants
    const parts = origPkgName
      .split(/[-.]/)
      .filter(p => p !== 'es' && p !== 'helpers')
    const compatData = getCompatData(['javascript', 'builtins', ...parts])
    const versionAdded =
      compatData?.support?.nodejs?.version_added ??
      maintainedNodeVersions.previous
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
        choices: esShimChoices
      })
    }
  } else if (isEsm) {
    templateChoice = TEMPLATE_CJS_ESM
  } else {
    templateChoice = await select({
      message: 'Pick the package template to use',
      choices: [
        { name: 'cjs', value: TEMPLATE_CJS },
        { name: 'cjs and browser', value: TEMPLATE_CJS_BROWSER }
      ]
    })
  }
  if (templateChoice === undefined) {
    // Exit if user force closed the prompt.
    return
  }
  if (tsRefs.length === 0) {
    const answer = await confirm({
      message: 'Need a TypeScript lib/types reference?',
      default: false
    })
    if (answer === undefined) {
      // Exit if user force closed the prompt.
      return
    }
    if (answer) {
      const searchResult = await search({
        message: 'Which one?',
        source: async input => {
          if (!input) return []
          // Trim, truncate, and lower input.
          const formatted = input.trim().slice(0, maxTsRefLength).toLowerCase()
          if (!formatted) return [input]
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
              threshold: 0.2
            })
          }
          if (matches.length === 0) {
            return [toChoice(input)]
          }
          const firstMatch = matches[0]
          const sortedTail =
            matches.length > 1 ? naturalSort(matches.slice(1)).desc() : []
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
        }
      })
      if (searchResult === undefined) {
        // Exit if user force closed the prompt.
        return
      }
      const name = tsLibsAvailable.has(searchResult) ? 'lib' : 'types'
      tsRefs.push({ name, value: searchResult })
    }
  }

  const templatePkgPath = templates[templateChoice]

  const interop = [
    'cjs',
    ...(TEMPLATE_CJS_ESM ? ['esm'] : []),
    ...(TEMPLATE_CJS_BROWSER ? ['browserify'] : [])
  ]

  // First copy the template directory contents to the package path.
  await fs.cp(templatePkgPath, pkgPath, { recursive: true })
  // Then modify the new package's package.json source and write to disk.
  await writeAction(
    await getPackageJsonAction(pkgPath, {
      engines: {
        // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
        node: nodeRange ?? constants.PACKAGE_DEFAULT_NODE_RANGE
      }
    })
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
            r => isCts || !(r.name === 'types' && r.value === 'node')
          )
          return data
        }
      }))
    ].map(writeAction)
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
    fs.writeFile(path.join(pkgPath, originalLicenseName), content, 'utf8')
  }
  if (filesFieldAdditions.length) {
    // Load the freshly written package.json and edit its "exports" and "files" fields.
    const editablePkgJson = await readPackageJson(pkgPath, { editable: true })
    const entryExports = resolvePackageJsonEntryExports(
      editablePkgJson.content.exports
    )
    const nmEntryExports = resolvePackageJsonEntryExports(nmPkgJson.exports)
    const useNmEntryExports =
      entryExports === undefined && isSubpathExports(nmEntryExports)
    editablePkgJson.update({
      main: useNmEntryExports ? undefined : pkgPath.content.main,
      exports: useNmEntryExports ? nmEntryExports : entryExports,
      files: [...editablePkgJson.content.files, ...filesFieldAdditions].sort(
        localeCompare
      )
    })
    await editablePkgJson.save()
  }

  // Update monorepo package.json workspaces definition and test/npm files.
  try {
    const spawnOptions = {
      cwd: rootPath,
      signal,
      stdio: 'inherit'
    }
    await runScript('update:manifest', [], spawnOptions)
    await runScript('update:package-json', [], spawnOptions)
    await runScript(
      'update:longtask:test:npm:package-json',
      ['--', '--quiet', '--add', origPkgName],
      spawnOptions
    )
    if (!cliArgs.quiet) {
      console.log('Finished 🎉')
    }
  } catch (e) {
    console.log('✖️ Package override finalization encountered an error:', e)
  }
})()
