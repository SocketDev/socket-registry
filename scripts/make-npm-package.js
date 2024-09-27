'use strict'

const path = require('node:path')

const spawn = require('@npmcli/promise-spawn')
const { ReturnTypeEnums, default: didYouMean } = require('didyoumean2')
const fs = require('fs-extra')
const { open } = require('out-url')
const semver = require('semver')

const constants = require('@socketregistry/scripts/constants')
const {
  ESNEXT,
  LICENSE,
  LICENSE_ORIGINAL_GLOB,
  execPath,
  npmPackagesPath,
  rootPath,
  tsLibs
} = constants
const { isDirEmptySync } = require('@socketregistry/scripts/utils/fs')
const { globLicenses } = require('@socketregistry/scripts/utils/globs')
const { isObject } = require('@socketregistry/scripts/utils/objects')
const {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  extractPackage,
  isValidPackageName,
  readPackageJson,
  resolveGitHubTgzUrl,
  resolvePackageLicenses
} = require('@socketregistry/scripts/utils/packages')
const {
  confirm,
  input,
  search,
  select
} = require('@socketregistry/scripts/utils/prompts')
const {
  localCompare,
  naturalSort
} = require('@socketregistry/scripts/utils/sorts')
const { indentString } = require('@socketregistry/scripts/utils/strings')
const {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTypeScriptActions,
  templateChoices,
  templates,
  writeAction
} = require('@socketregistry/scripts/utils/templates')

const bcaKeysMap = new Map()
const esShimsRepoRegExp = /^git(?:\+https)?:\/\/github\.com\/es-shims\//

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
    const keysMap = getBcdKeysMap(obj)
    const newObj = obj[keysMap.get(props[i].toLowerCase())]
    if (!isObject(newObj)) {
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

;(async () => {
  const pkgName = await input({
    message: 'What is the name of the package to override?',
    validate: isValidPackageName
  })
  if (pkgName === undefined) {
    // Exit if user force closed the prompt.
    return
  }
  const pkgPath = path.join(npmPackagesPath, pkgName)
  if (fs.existsSync(pkgPath) && !isDirEmptySync(pkgPath)) {
    const relPkgPath = path.relative(rootPath, pkgPath)
    console.log(`⚠️ ${pkgName} already exists at ${relPkgPath}`)
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
  let licenses
  let licenseContents
  let licenseWarnings
  let nmPkgJson
  await extractPackage(pkgName, async pkgDirPath => {
    nmPkgJson = await readPackageJson(pkgDirPath)
    licenses = resolvePackageLicenses(nmPkgJson.license, pkgDirPath)
    licenseWarnings = collectLicenseWarnings(licenses)
    badLicenses = collectIncompatibleLicenses(licenses)
    if (!badLicenses.length) {
      licenseContents = await readLicenses(pkgDirPath)
      if (!licenseContents.length) {
        const tgzUrl = await resolveGitHubTgzUrl(pkgName, nmPkgJson)
        if (tgzUrl) {
          extractPackage(tgzUrl, async tarDirPath => {
            licenseContents = await readLicenses(tarDirPath)
          })
        }
      }
    }
  })
  if (!nmPkgJson) {
    console.log(`✘ Failed to extract ${pkgName}`)
    return
  }
  if (licenseWarnings.length) {
    const formattedWarnings = licenseWarnings.map(w =>
      indentString(`• ${w}`, 2)
    )
    console.log(
      `⚠️ ${pkgName} has license warnings:\n${formattedWarnings.join('\n')}`
    )
  }
  if (badLicenses.length) {
    const singularOrPlural = `license${badLicenses.length === 1 ? '' : 's'}`
    const warning = `⚠️ ${pkgName} has incompatible ${singularOrPlural} ${badLicenses.join(', ')}.`
    const answer = await confirm({
      message: `${warning}.\nDo you want to continue?`,
      default: false
    })
    if (!answer) {
      if (answer === false) {
        await open(`https://npmjs.com/package/${pkgName}`)
      }
      return
    }
  }
  const isEsm = nmPkgJson.type === 'module'
  const isEsShim = esShimsRepoRegExp.test(nmPkgJson.repository?.url)

  let nodeRange
  let templateChoice
  let tsLib
  if (isEsShim) {
    // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
    const { PACKAGE_DEFAULT_NODE_RANGE, maintainedNodeVersions } = constants
    const parts = pkgName.split('.')
    const compatData = getCompatData([
      'javascript',
      'builtins',
      ...parts.filter(p => p !== 'prototype')
    ])
    const versionAdded =
      compatData?.support?.nodejs?.version_added ??
      maintainedNodeVersions.get('previous')
    nodeRange = `>=${maintainedNodeVersions.get('next')}`
    if (!semver.satisfies(versionAdded, nodeRange)) {
      nodeRange = `>=${maintainedNodeVersions.get('current')}`
      if (!semver.satisfies(versionAdded, nodeRange)) {
        nodeRange = PACKAGE_DEFAULT_NODE_RANGE
      }
    }
    if (nodeRange !== PACKAGE_DEFAULT_NODE_RANGE) {
      tsLib = ESNEXT
    }
    if (
      (parts.length === 3 && parts[1] === 'prototype') ||
      compatData?.spec_url?.includes('.prototype')
    ) {
      templateChoice = 'es-shim-prototype-method'
    } else if (parts.length === 2) {
      templateChoice = 'es-shim static method'
    } else {
      templateChoice = await select({
        message: 'Pick the es-shim template to use',
        choices: templateChoices.esShim
      })
    }
  } else if (isEsm) {
    templateChoice = await select({
      message: 'Pick the ESM template to use',
      choices: templateChoices.nodeEsm
    })
  } else {
    templateChoice = await select({
      message: 'Pick the package template to use',
      choices: [
        { name: 'default', value: 'default' },
        ...templateChoices.nodeCjs,
        ...templateChoices.esShim
      ]
    })
  }
  if (templateChoice === undefined) {
    // Exit if user force closed the prompt.
    return
  }
  if (tsLib === undefined && templateChoice.startsWith('es-shim')) {
    const availableTsLibs = [...tsLibs]
    const maxTsLibLength = availableTsLibs.reduce(
      (n, v) => Math.max(n, v.length),
      0
    )
    const answer = await confirm({
      message: 'Does this override need a TypeScript lib?',
      default: false
    })
    if (answer === undefined) {
      // Exit if user force closed the prompt.
      return
    }
    if (answer) {
      tsLib = await search({
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
      if (tsLib === undefined) {
        // Exit if user force closed the prompt.
        return
      }
    }
  }

  const templatePkgPath = templates[templateChoice]

  // First copy the template directory contents to the package path.
  await fs.copy(templatePkgPath, pkgPath)
  // Then modify the new package's package.json source and write to disk.
  await writeAction(await getPackageJsonAction(pkgPath, nodeRange))
  // Finally, modify other package file sources and write to disk.
  await Promise.all(
    [
      await getNpmReadmeAction(pkgPath),
      ...(await getLicenseActions(pkgPath)),
      ...(tsLib ? await getTypeScriptActions(pkgPath, tsLib) : [])
    ].map(writeAction)
  )
  // Create LICENSE.original files.
  const { length: licenseCount } = licenseContents
  const originalLicenseNames = []
  if (licenseCount === 1) {
    const { content, name } = licenseContents[0]
    const ext = path.extname(name)
    const originalLicenseName = `${LICENSE}.original${ext}`
    originalLicenseNames.push(originalLicenseName)
    await fs.writeFile(path.join(pkgPath, originalLicenseName), content, 'utf8')
  } else if (licenseCount > 1) {
    for (let i = 0; i < licenseCount; i += 1) {
      const { content, name } = licenseContents[i]
      const ext = path.extname(name)
      const basename = path.basename(name, ext)
      const originalLicenseName = `${basename}.original${ext}`
      originalLicenseNames.push(originalLicenseName)
      fs.writeFile(path.join(pkgPath, originalLicenseName), content, 'utf8')
    }
  }
  // Load new package's package.json and edit its "files" field.
  const editablePkgJson = await readPackageJson(pkgPath, { editable: true })
  const filesField = editablePkgJson.content.files.filter(
    g => g !== LICENSE_ORIGINAL_GLOB
  )
  filesField.push(...originalLicenseNames)
  editablePkgJson.update({
    files: filesField.sort(localCompare)
  })
  await editablePkgJson.save()

  // Update monorepo package.json workspaces definition and test/npm files.
  try {
    await spawn(
      execPath,
      [
        // Lazily access constants.runScriptParallelExecPath.
        constants.runScriptParallelExecPath,
        'update:package-json',
        `update:longtask:test:npm:package-json -- --add ${pkgName}`
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
