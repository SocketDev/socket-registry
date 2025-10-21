/**
 * @fileoverview Package template generation utilities for Socket registry.
 * Provides template-based package creation and code generation functions.
 */

import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { PackageURL } from '@socketregistry/packageurl-js'
import { joinAnd } from '@socketsecurity/lib/arrays'
import { globStreamLicenses } from '@socketsecurity/lib/globs'
import { getManifestData } from '@socketsecurity/lib/index'
import { isObjectObject } from '@socketsecurity/lib/objects'
import { capitalize, determineArticle } from '@socketsecurity/lib/words'
import { Eta } from 'eta'
import fastGlob from 'fast-glob'
import semver from 'semver'

import { UTF8 } from '@socketsecurity/lib/constants/encoding'
import {
  NPM,
  NPM_TEMPLATES_PATH,
  PACKAGE_JSON,
  README_MD,
} from '../constants/paths.mjs'
import {
  TEMPLATE_CJS,
  TEMPLATE_CJS_BROWSER,
  TEMPLATE_CJS_ESM,
  TEMPLATE_ES_SHIM_CONSTRUCTOR,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  TEMPLATE_ES_SHIM_STATIC_METHOD,
} from '../constants/templates.mjs'
import { getLicenseContent } from '../constants/utils.mjs'
import { biomeFormat } from './biome.mjs'

// Use require for CommonJS modules that don't properly export named exports.
const require = createRequire(import.meta.url)
const packagesOperations = require('../../registry/dist/lib/packages/operations.js')
const { readPackageJson, resolveOriginalPackageName } = packagesOperations

// File extension constants.
const EXT_JSON = '.json'
const EXT_MD = '.md'

// Package default constants from registry manifest.
const PACKAGE_DEFAULT_NODE_RANGE = '>=18'
const PACKAGE_DEFAULT_SOCKET_CATEGORIES = Object.freeze(['levelup', 'tuneup'])
const PACKAGE_DEFAULT_VERSION = '1.0.0'

let eta
async function getEta() {
  if (!eta) {
    eta = new Eta()
  }
  return eta
}

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
          TEMPLATE_ES_SHIM_STATIC_METHOD,
        ].map(k => [k, path.join(NPM_TEMPLATES_PATH, k)]),
      ),
    })
  }
  return _templates
}

/**
 * Retrieve template path by name.
 */
function getTemplate(name) {
  return getTemplates()[name]
}

/**
 * Generate actions for copying license files to package.
 */
async function getLicenseActions(pkgPath) {
  const LICENSE_CONTENT = getLicenseContent()
  const licenseData = {
    __proto__: null,
    license: LICENSE_CONTENT,
  }
  const actions = []
  for await (const filepath of globStreamLicenses(pkgPath, {
    recursive: true,
  })) {
    actions.push([filepath, licenseData])
  }
  return actions
}

/**
 * Generate action for creating package README with rendered template.
 */
async function getNpmReadmeAction(pkgPath, options) {
  const { interop } = { __proto__: null, ...options }
  const eco = NPM
  const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
  const pkgJson = await readPackageJson(pkgJsonPath, { normalize: true })
  const pkgPurlObj = PackageURL.fromString(
    `pkg:${eco}/${pkgJson.name}@${pkgJson.version}`,
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
    'tested',
  ]
  return [
    path.join(pkgPath, README_MD),
    {
      __proto__: null,
      readme: await renderAction([
        path.join(NPM_TEMPLATES_PATH, README_MD),
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
          version: semver.parse(pkgJson.version),
        },
      ]),
    },
  ]
}

/**
 * Generate action for creating or updating package.json.
 */
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
        : Array.from(PACKAGE_DEFAULT_SOCKET_CATEGORIES),
      engines: engines ?? { node: PACKAGE_DEFAULT_NODE_RANGE },
      version: semver.parse(manifestData?.version ?? PACKAGE_DEFAULT_VERSION),
    },
  ]
}

/**
 * Generate actions for processing TypeScript definition files.
 */
async function getTypeScriptActions(pkgPath, options) {
  const { references, transform } = { __proto__: null, ...options }
  const doTransform = typeof transform === 'function'
  const filepaths = await fastGlob.glob(['**/*.{[cm],}ts'], {
    absolute: true,
    cwd: pkgPath,
  })
  const actions = []
  await Promise.all(
    filepaths.map(async filepath => {
      const data = {
        __proto__: null,
        references: Array.isArray(references) ? references : [],
      }
      actions.push([
        filepath,
        doTransform ? await transform(filepath, data) : data,
      ])
    }),
  )
  return actions
}

/**
 * Preprocess template content by unwrapping encoded tags and stripping comments.
 */
function prepareTemplate(content) {
  return (
    content
      // Replace strings that look like "//_ <%...%>" with <%...%>.
      // Enquoting the tags avoids syntax errors in JSON template files.
      .replace(
        /(["'])\/\/_\s*(<%[-_]?[=~]?[\s\S]+%>)\1/g,
        (_match, _quote, tag) => tag,
      )
      // Strip single line comments start with //_
      .replace(/\/\/_\s*/g, '')
  )
}

/**
 * Render a template action using Eta and format output.
 */
async function renderAction(action) {
  const { 0: filepath, 1: dataRaw } = action
  const data = typeof dataRaw === 'function' ? await dataRaw() : dataRaw
  const ext = path.extname(filepath)
  const content = await fs.readFile(filepath, UTF8)
  const prepared = prepareTemplate(content)
  const etaInstance = await getEta()
  const modified = await etaInstance.renderStringAsync(prepared, data)
  return ext === EXT_JSON || ext === EXT_MD
    ? await biomeFormat(modified, { filepath })
    : modified
}

/**
 * Render and write a template action to disk.
 */
async function writeAction(action) {
  const { 0: filepath } = action
  return await fs.writeFile(filepath, await renderAction(action), UTF8)
}

export {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTemplate,
  getTypeScriptActions,
  renderAction,
  writeAction,
}
