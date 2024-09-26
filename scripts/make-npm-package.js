'use strict'

const path = require('node:path')

const { default: confirm } = require('@inquirer/confirm')
const { default: input } = require('@inquirer/input')
const { default: search } = require('@inquirer/search')
const { default: select } = require('@inquirer/select')
const spawn = require('@npmcli/promise-spawn')
const { ReturnTypeEnums, default: didYouMean } = require('didyoumean2')
const fs = require('fs-extra')
const { open } = require('out-url')

const {
  LICENSE,
  execPath,
  npmPackagesPath,
  rootPath,
  runScriptParallelExecPath,
  tsLibs
} = require('@socketregistry/scripts/constants')
const { isDirEmptySync } = require('@socketregistry/scripts/utils/fs')
const { globLicenses } = require('@socketregistry/scripts/utils/globs')
const {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  extractPackage,
  isValidPackageName,
  readPackageJson,
  resolveGitHubTgzUrl,
  resolvePackageLicenses
} = require('@socketregistry/scripts/utils/packages')
const { naturalSort } = require('@socketregistry/scripts/utils/sorts')
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

const esShimsRepoRegExp = /^git(?:\+https)?:\/\/github\.com\/es-shims\//

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
  const pkgPath = path.join(npmPackagesPath, pkgName)
  if (fs.existsSync(pkgPath) && !isDirEmptySync(pkgPath)) {
    const relPkgPath = path.relative(rootPath, pkgPath)
    console.log(`⚠️ ${pkgName} already exists at ${relPkgPath}`)
    return
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
    if (
      !(await confirm({
        message: `${warning}.\nDo you want to continue?`,
        default: false
      }))
    ) {
      await open(`https://npmjs.com/package/${pkgName}`)
      return
    }
  }
  const isEsm = nmPkgJson.type === 'module'
  const isEsShim = esShimsRepoRegExp.test(nmPkgJson.repository?.url)

  let templateChoice
  if (isEsShim) {
    const parts = pkgName.split('.')
    if (parts.length === 3 && parts[1] === 'prototype') {
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

  let tsLib
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
    }
  }

  const templatePkgPath = templates[templateChoice]

  await fs.copy(templatePkgPath, pkgPath)
  // Ensure the package's package.json is modified first.
  await writeAction(getPackageJsonAction(pkgPath))
  await Promise.all(
    [
      await getNpmReadmeAction(pkgPath),
      ...(await getLicenseActions(pkgPath)),
      ...(tsLib ? await getTypeScriptActions(pkgPath, tsLib) : [])
    ].map(writeAction)
  )

  // Create LICENSE.original files.
  const { length: licenseCount } = licenseContents
  if (licenseCount === 1) {
    const { content, name } = licenseContents[0]
    const ext = path.extname(name)
    await fs.writeFile(
      path.join(pkgPath, `${LICENSE}.original${ext}`),
      content,
      'utf8'
    )
  } else if (licenseCount > 1) {
    for (let i = 0; i < licenseCount; i += 1) {
      const { content, name } = licenseContents[i]
      const ext = path.extname(name)
      const basename = path.basename(name, ext)
      fs.writeFile(
        path.join(pkgPath, `${basename}.original${ext}`),
        content,
        'utf8'
      )
    }
  }
  // Update monorepo package.json workspaces definition and test/npm files.
  try {
    await spawn(
      execPath,
      [
        runScriptParallelExecPath,
        'update:package-json',
        `update:test:npm:package-json -- --add ${pkgName}`
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
