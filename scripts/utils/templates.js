'use strict'

const path = require('node:path')

const { Eta } = require('eta')
const fs = require('fs-extra')
const { PackageURL } = require('packageurl-js')
const semver = require('semver')
const { glob: tinyGlob } = require('tinyglobby')

const manifest = require('@socketregistry/manifest')
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
const { globLicenses } = require('@socketregistry/scripts/utils/globs')
const { isObjectObject } = require('@socketregistry/scripts/utils/objects')
const { readPackageJson } = require('@socketregistry/scripts/utils/packages')
const { prettierFormat } = require('@socketregistry/scripts/utils/strings')

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
    license: LICENSE_CONTENT.trim()
  }
  const actions = []
  for (const filepath of await globLicenses(pkgPath, { recursive: true })) {
    actions.push([filepath, licenseData])
  }
  return actions
}

function getManifestData(pkgName) {
  return manifest.npm
    .find(({ 0: purlStr }) => PackageURL.fromString(purlStr).name === pkgName)
    ?.at(1)
}

function getOriginalName(pkgName, manifestData) {
  return `${manifestData?.scope ?? ''}${pkgName}`
}

async function getNpmReadmeAction(pkgPath) {
  const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
  const pkgJson = await readPackageJson(pkgJsonPath)
  const pkgPurlObj = PackageURL.fromString(
    `pkg:npm/${pkgJson.name}@${pkgJson.version}`
  )
  const { name: pkgName } = pkgPurlObj
  const manifestData = getManifestData(pkgName)
  const categories = manifestData?.categories
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
          originalName: getOriginalName(pkgName, manifestData),
          categories: Array.isArray(categories)
            ? categories
            : [...PACKAGE_DEFAULT_SOCKET_CATEGORIES],
          dependencies: isObjectObject(pkgJson.dependencies) ?? {},
          purl: pkgPurlObj,
          version: semver.parse(pkgJson.version)
        }
      ])
    }
  ]
}

async function getPackageJsonAction(pkgPath, options) {
  const { engines } = { __proto__: null, ...options }
  const pkgName = path.basename(pkgPath)
  const manifestData = getManifestData(pkgName)
  const categories = manifestData?.categories
  return [
    path.join(pkgPath, PACKAGE_JSON),
    {
      __proto__: null,
      ...manifestData,
      name: pkgName,
      originalName: getOriginalName(pkgName, manifestData),
      categories: Array.isArray(categories)
        ? categories
        : [...PACKAGE_DEFAULT_SOCKET_CATEGORIES],
      // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
      engines: engines ?? { node: constants.PACKAGE_DEFAULT_NODE_RANGE },
      // Lazily access constants.PACKAGE_DEFAULT_VERSION.
      version: semver.parse(constants.PACKAGE_DEFAULT_VERSION)
    }
  ]
}

async function getTypeScriptActions(pkgPath, options) {
  const { references, transform } = { __proto__: null, ...options }
  const doTransform = typeof transform === 'function'
  const actions = []
  for (const filepath of await tinyGlob(['**/*.{[cm],}ts'], {
    absolute: true,
    cwd: pkgPath
  })) {
    const data = {
      __proto__: null,
      references: Array.isArray(references) ? references : []
    }
    actions.push([
      filepath,
      doTransform ? await transform(filepath, data) : data
    ])
  }
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
  getManifestData,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTypeScriptActions,
  renderAction,
  templates,
  writeAction
}
