'use strict'

const { promises: fs } = require('node:fs')
const path = require('node:path')

const semver = require('semver')
const tinyglobby = require('tinyglobby')

const { PackageURL } = require('@socketregistry/packageurl-js')
const constants = require('@socketregistry/scripts/constants')
const { getManifestData } = require('@socketsecurity/registry')
const { joinAnd } = require('@socketsecurity/registry/lib/arrays')
const { globLicenses } = require('@socketsecurity/registry/lib/globs')
const { isObjectObject } = require('@socketsecurity/registry/lib/objects')
const {
  readPackageJson,
  resolveOriginalPackageName
} = require('@socketsecurity/registry/lib/packages')
const {
  capitalize,
  determineArticle
} = require('@socketsecurity/registry/lib/words')
const { biomeFormat } = require('./biome')

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
  TEMPLATE_ES_SHIM_STATIC_METHOD,
  UTF8
} = constants

const eta = new (require('eta').Eta)()

let _templates
function getTemplates() {
  if (_templates === undefined) {
    _templates = Object.freeze({
      __proto__: null,
      ...Object.fromEntries(
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
  const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
  const pkgJson = await readPackageJson(pkgJsonPath)
  const pkgPurlObj = PackageURL.fromString(
    `pkg:${eco}/${pkgJson.name}@${pkgJson.version}`
  )
  const { name: sockRegPkgName } = pkgPurlObj
  const manifestData = getManifestData(eco, sockRegPkgName)
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
          adjectivesText: `${capitalize(determineArticle(adjectives[0]))} ${joinAnd(adjectives)}`,
          categories,
          dependencies: isObjectObject(pkgJson.dependencies) ?? {},
          originalName: resolveOriginalPackageName(sockRegPkgName),
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
  const sockRegPkgName = path.basename(pkgPath)
  const manifestData = getManifestData(eco, sockRegPkgName)
  const categories = manifestData?.categories
  return [
    path.join(pkgPath, PACKAGE_JSON),
    {
      __proto__: null,
      ...manifestData,
      name: sockRegPkgName,
      originalName: resolveOriginalPackageName(sockRegPkgName),
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
  const filepaths = await tinyglobby.glob(['**/*.{[cm],}ts'], {
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
  const ext = path.extname(filepath)
  const content = await fs.readFile(filepath, UTF8)
  const prepared = prepareTemplate(content)
  const modified = await eta.renderStringAsync(prepared, data)
  return ext === '.json' || ext === '.md'
    ? await biomeFormat(modified, { filepath })
    : modified
}

async function writeAction(action) {
  const { 0: filepath } = action
  return await fs.writeFile(filepath, await renderAction(action), UTF8)
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
