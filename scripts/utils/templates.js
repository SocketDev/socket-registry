'use strict'

const path = require('node:path')

const { Eta } = require('eta')
const fs = require('fs-extra')
const { PackageURL } = require('packageurl-js')
const semver = require('semver')
const { glob: tinyGlob } = require('tinyglobby')

const constants = require('@socketregistry/scripts/constants')
const {
  LICENSE_CONTENT,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES,
  PACKAGE_JSON,
  README_MD,
  TEMPLATE_CJS,
  TEMPLATE_CJS_BROWSER,
  TEMPLATE_CJS_ESM,
  TEMPLATE_ES_SHIM_CONSTRUCTOR,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  TEMPLATE_ES_SHIM_STATIC_METHOD,
  npmTemplatesPath
} = constants
const { joinAsList } = require('@socketregistry/scripts/utils/arrays')
const { globLicenses } = require('@socketregistry/scripts/utils/globs')
const { isObjectObject } = require('@socketregistry/scripts/utils/objects')
const {
  readPackageJson,
  resolveOriginalPackageName
} = require('@socketregistry/scripts/utils/packages')
const { prettierFormat } = require('@socketregistry/scripts/utils/strings')
const { getManifestData } = require('@socketsecurity/registry')

const eta = new Eta()

const templates = Object.freeze({
  __proto__: null,
  ...Object.fromEntries(
    [
      TEMPLATE_CJS,
      TEMPLATE_CJS_BROWSER,
      TEMPLATE_CJS_ESM,
      TEMPLATE_ES_SHIM_CONSTRUCTOR,
      TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
      TEMPLATE_ES_SHIM_STATIC_METHOD
    ].map(k => [k, path.join(npmTemplatesPath, k)])
  )
})

function prepareTemplate(content) {
  return (
    content
      // Replace strings that look like "//_ <%...%>" with <%...%>.
      // Enquoting the tags avoids syntax errors in JSON template files.
      .replace(
        /(["'])\/\/_\s*(<%[-_]?[=~]?[\s\S]+%>)\1/g,
        (_match, _quote, tag) => tag
      )
      // Strip single line comments start with //_
      .replace(/\/\/_\s*/g, '')
  )
}

async function getLicenseActions(pkgPath) {
  const licenseData = {
    __proto__: null,
    license: LICENSE_CONTENT
  }
  const actions = []
  for (const filepath of await globLicenses(pkgPath, { recursive: true })) {
    actions.push([filepath, licenseData])
  }
  return actions
}

async function getNpmReadmeAction(pkgPath) {
  const eco = 'npm'
  const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
  const pkgJson = await readPackageJson(pkgJsonPath)
  const pkgPurlObj = PackageURL.fromString(
    `pkg:${eco}/${pkgJson.name}@${pkgJson.version}`
  )
  const { name: regPkgName } = pkgPurlObj
  const manifestData = getManifestData(eco, regPkgName)
  const categories = Array.isArray(manifestData?.categories)
    ? manifestData.categories
    : [...PACKAGE_DEFAULT_SOCKET_CATEGORIES]
  const adjectives = [
    ...(categories.includes('speedup') ? ['fast'] : []),
    ...(categories.includes('levelup') ? ['enhanced'] : []),
    ...(categories.includes('tuneup') ? ['secure'] : []),
    'tested'
  ]
  return [
    path.join(pkgPath, README_MD),
    {
      __proto__: null,
      readme: await renderAction([
        path.join(npmTemplatesPath, README_MD),
        {
          __proto__: null,
          ...manifestData,
          ...pkgJson,
          adjectivesText: joinAsList(adjectives),
          categories,
          dependencies: isObjectObject(pkgJson.dependencies) ?? {},
          originalName: resolveOriginalPackageName(regPkgName),
          purl: pkgPurlObj,
          version: semver.parse(pkgJson.version)
        }
      ])
    }
  ]
}

async function getPackageJsonAction(pkgPath, options) {
  const { engines } = { __proto__: null, ...options }
  const eco = 'npm'
  const regPkgName = path.basename(pkgPath)
  const manifestData = getManifestData(eco, regPkgName)
  const categories = manifestData?.categories
  return [
    path.join(pkgPath, PACKAGE_JSON),
    {
      __proto__: null,
      ...manifestData,
      name: regPkgName,
      originalName: resolveOriginalPackageName(regPkgName),
      categories: Array.isArray(categories)
        ? categories
        : [...PACKAGE_DEFAULT_SOCKET_CATEGORIES],
      // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
      engines: engines ?? { node: constants.PACKAGE_DEFAULT_NODE_RANGE },
      // Lazily access constants.PACKAGE_DEFAULT_VERSION.
      version: semver.parse(
        manifestData?.version ?? constants.PACKAGE_DEFAULT_VERSION
      )
    }
  ]
}

async function getTypeScriptActions(pkgPath, options) {
  const { references, transform } = { __proto__: null, ...options }
  const doTransform = typeof transform === 'function'
  const filepaths = await tinyGlob(['**/*.{[cm],}ts'], {
    absolute: true,
    cwd: pkgPath
  })
  const actions = []
  await Promise.all(
    filepaths.map(async filepath => {
      const data = {
        __proto__: null,
        references: Array.isArray(references) ? references : []
      }
      actions.push([
        filepath,
        doTransform ? await transform(filepath, data) : data
      ])
    })
  )
  return actions
}

async function renderAction(action) {
  const { 0: filepath, 1: dataRaw } = action
  const data = typeof dataRaw === 'function' ? await dataRaw() : dataRaw
  const ext = path.extname(filepath)
  const content = await fs.readFile(filepath, 'utf8')
  const prepared = prepareTemplate(content)
  const modified = await eta.renderStringAsync(prepared, data)
  return ext === '.json' || ext === '.md'
    ? await prettierFormat(modified, { filepath })
    : modified
}

async function writeAction(action) {
  const { 0: filepath } = action
  return await fs.writeFile(filepath, await renderAction(action), 'utf8')
}

module.exports = {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTypeScriptActions,
  renderAction,
  templates,
  writeAction
}
