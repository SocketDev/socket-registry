'use strict'

const path = require('node:path')

const { default: confirm } = require('@inquirer/confirm')
const { default: input } = require('@inquirer/input')
const { default: search } = require('@inquirer/search')
const { default: select } = require('@inquirer/select')
const spawn = require('@npmcli/promise-spawn')
const { default: didYouMean, ReturnTypeEnums } = require('didyoumean2')
const fs = require('fs-extra')
const { open } = require('out-url')
const prettier = require('prettier')
const { glob: tinyGlob } = require('tinyglobby')

const {
  LICENSE_CONTENT,
  LICENSE_GLOB_PATTERN,
  PACKAGE_ENGINES_NODE_RANGE,
  PACKAGE_JSON,
  execPath,
  npmPackagesPath,
  npmTemplatesPath,
  rootPath,
  runScriptParallelExecPath,
  tsLibs
} = require('@socketregistry/scripts/constants')
const { isDirEmptySync } = require('@socketregistry/scripts/utils/fs')
const { globLicenses } = require('@socketregistry/scripts/utils/glob')
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

const esShimsRepoRegExp = /^git(?:\+https)?:\/\/github\.com\/es-shims\//

function modifyContent(content, data = {}) {
  let modified = content
  for (const { 0: key, 1: value } of Object.entries(data)) {
    const templateKey = key.replaceAll('-', '_').toUpperCase()
    if (Array.isArray(value)) {
      const stringified = JSON.stringify(value)
      modified = modified
        .replaceAll(`["%${templateKey}%"]`, stringified)
        .replaceAll(`%${templateKey}%`, stringified)
    } else {
      modified = modified.replaceAll(`%${templateKey}%`, value)
    }
  }
  return modified
}

async function readLicenses(dirname) {
  return await Promise.all(
    (await globLicenses(dirname)).map(async p => ({
      name: path.basename(p),
      content: await fs.readFile(p, 'utf8')
    }))
  )
}

const templates = Object.fromEntries(
  [
    'default',
    'es-shim-prototype-method',
    'es-shim-static-method',
    'node-cjs',
    'node-cjs+browser',
    'node-esm',
    'node-esm+browser'
  ].map(k => [k, path.join(npmTemplatesPath, k)])
)

const esShimTemplateChoices = [
  { name: 'es-shim prototype method', value: 'es-shim-prototype-method' },
  { name: 'es-shim static method', value: 'es-shim-static-method' }
]

const nodeCjsTemplateChoices = [
  { name: 'node cjs', value: 'node-cjs' },
  { name: 'node cjs plus browser', value: 'node-cjs+browser' }
]

const nodeEsmTemplateChoices = [
  { name: 'node esm', value: 'node-esm' },
  { name: 'node esm plus browser', value: 'node-esm+browser' }
]

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
  let pkgJson
  await extractPackage(pkgName, async pkgDirPath => {
    pkgJson = await readPackageJson(pkgDirPath)
    licenses = resolvePackageLicenses(pkgJson.license, pkgDirPath)
    licenseWarnings = collectLicenseWarnings(licenses)
    badLicenses = collectIncompatibleLicenses(licenses)
    if (!badLicenses.length) {
      licenseContents = await readLicenses(pkgDirPath)
      if (!licenseContents.length) {
        const tgzUrl = await resolveGitHubTgzUrl(pkgName, pkgJson)
        if (tgzUrl) {
          extractPackage(tgzUrl, async tarDirPath => {
            licenseContents = await readLicenses(tarDirPath)
          })
        }
      }
    }
  })
  if (!pkgJson) {
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
  const isEsm = pkgJson.type === 'module'
  const isEsShim = esShimsRepoRegExp.test(pkgJson.repository?.url)

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
        choices: esShimTemplateChoices
      })
    }
  } else if (isEsm) {
    templateChoice = await select({
      message: 'Pick the ESM template to use',
      choices: nodeEsmTemplateChoices
    })
  } else {
    templateChoice = await select({
      message: 'Pick the package template to use',
      choices: [
        { name: 'default', value: 'default' },
        ...nodeCjsTemplateChoices,
        ...esShimTemplateChoices
      ]
    })
  }

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
  const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)

  await fs.copy(srcPath, pkgPath)

  const actions = []
  const licenseData = {
    license: LICENSE_CONTENT.trim()
  }
  for (const filepath of await tinyGlob([`**/${LICENSE_GLOB_PATTERN}`], {
    absolute: true,
    cwd: pkgPath
  })) {
    actions.push([filepath, licenseData])
  }
  if (ts_lib) {
    const tsData = {
      ts_lib
    }
    for (const filepath of await tinyGlob(['**/*.ts'], {
      absolute: true,
      cwd: pkgPath
    })) {
      actions.push([filepath, tsData])
    }
  }
  actions.push([
    pkgJsonPath,
    {
      name: pkgName,
      node_range: PACKAGE_ENGINES_NODE_RANGE,
      categories: ['cleanup']
    }
  ])
  await Promise.all(
    actions.map(async ({ 0: filepath, 1: data }) => {
      const ext = path.extname(filepath)
      const content = await fs.readFile(filepath, 'utf8')
      const modified = modifyContent(content, { ...data })
      const output =
        ext === '.json'
          ? await prettier.format(modified, { parser: 'json' })
          : modified
      return await fs.writeFile(filepath, output, 'utf8')
    })
  )
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
