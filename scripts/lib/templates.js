'use strict'

let _eta
function getEta() {
  if (_eta === undefined) {
    const id = 'eta'
    _eta = new require(`${id}`).Eta()
  }
  return _eta
}

let _fs
function getFs() {
  if (_fs === undefined) {
    const id = 'node:fs'
    _fs = require(`${id}`)
  }
  return _fs
}

let _PackageURL
function getPackageURL() {
  if (_PackageURL === undefined) {
    const id = 'packageurl-js'
    _PackageURL = require(`${id}`).PackageURL
  }
  return _PackageURL
}

let _path
function getPath() {
  if (_path === undefined) {
    const id = 'node:path'
    _path = require(`${id}`)
  }
  return _path
}

let _semver
function getSemver() {
  if (_semver === undefined) {
    const id = 'semver'
    _semver = require(`${id}`)
  }
  return _semver
}

let _tinyGlobby
function getTinyGlobby() {
  if (_tinyGlobby === undefined) {
    const id = 'tinyglobby'
    _tinyGlobby = require(`${id}`)
  }
  return _tinyGlobby
}

const constants = require('@socketregistry/scripts/constants')
const {
  LICENSE_CONTENT,
  NPM,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES,
  PACKAGE_JSON,
  README_MD,
  TEMPLATE_CJS,
  TEMPLATE_CJS_BROWSER,
  TEMPLATE_CJS_ESM,
  TEMPLATE_ES_SHIM_CONSTRUCTOR,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  TEMPLATE_ES_SHIM_STATIC_METHOD
} = constants
const { getManifestData } = require('@socketsecurity/registry')
const { joinAsList } = require('@socketsecurity/registry/lib/arrays')
const { globLicenses } = require('@socketsecurity/registry/lib/globs')
const {
  isObjectObject,
  objectFromEntries
} = require('@socketsecurity/registry/lib/objects')
const {
  readPackageJson,
  resolveOriginalPackageName
} = require('@socketsecurity/registry/lib/packages')
const { prettierFormat } = require('@socketsecurity/registry/lib/strings')
const {
  capitalize,
  determineArticle
} = require('@socketsecurity/registry/lib/words')

let _templates
function getTemplates() {
  if (_templates === undefined) {
    const path = getPath()
    _templates = Object.freeze({
      __proto__: null,
      ...objectFromEntries(
        [
          TEMPLATE_CJS,
          TEMPLATE_CJS_BROWSER,
          TEMPLATE_CJS_ESM,
          TEMPLATE_ES_SHIM_CONSTRUCTOR,
          TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
          TEMPLATE_ES_SHIM_STATIC_METHOD
        ].map(k =>
          // Lazily access constants.npmTemplatesPath.
          [k, path.join(constants.npmTemplatesPath, k)]
        )
      )
    })
  }
  return _templates
}

function getTemplate(name) {
  return getTemplates()[name]
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

async function getNpmReadmeAction(pkgPath, options) {
  const { interop } = { __proto__: null, ...options }
  const eco = NPM
  const PackageURL = getPackageURL()
  const path = getPath()
  const semver = getSemver()
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
        // Lazily access constants.npmTemplatesPath.
        path.join(constants.npmTemplatesPath, README_MD),
        {
          __proto__: null,
          ...manifestData,
          ...pkgJson,
          ...(interop ? { interop } : {}),
          adjectivesText: `${capitalize(determineArticle(adjectives[0]))} ${joinAsList(adjectives)}`,
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
  const eco = NPM
  const path = getPath()
  const semver = getSemver()
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
  const tinyGlobby = getTinyGlobby()
  const filepaths = await tinyGlobby.glob(['**/*.{[cm],}ts'], {
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

async function renderAction(action) {
  const { 0: filepath, 1: dataRaw } = action
  const data = typeof dataRaw === 'function' ? await dataRaw() : dataRaw
  const eta = getEta()
  const fs = getFs()
  const path = getPath()
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
  return await getFs().writeFile(filepath, await renderAction(action), 'utf8')
}

module.exports = {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTemplate,
  getTypeScriptActions,
  renderAction,
  writeAction
}
