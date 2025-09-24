'use strict'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import fastGlob from 'fast-glob'
import semver from 'semver'

import { PackageURL } from '@socketregistry/packageurl-js'
import { getManifestData } from '@socketsecurity/registry'
import { joinAnd } from '@socketsecurity/registry/lib/arrays'
import { globStreamLicenses } from '@socketsecurity/registry/lib/globs'
import { isObjectObject } from '@socketsecurity/registry/lib/objects'
import {
  readPackageJson,
  resolveOriginalPackageName,
} from '@socketsecurity/registry/lib/packages'
import {
  capitalize,
  determineArticle,
} from '@socketsecurity/registry/lib/words'

import constants from '@socketregistry/scripts/constants'
import { biomeFormat } from './biome.mjs'

const {
  EXT_JSON,
  EXT_MD,
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
  UTF8,
} = constants

let eta
async function getEta() {
  if (!eta) {
    const etaExport = await import('eta')
    const EtaCtor = etaExport.Eta
    eta = new EtaCtor()
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
        ].map(k => [k, path.join(constants.npmTemplatesPath, k)]),
      ),
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
          version: semver.parse(pkgJson.version),
        },
      ]),
    },
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
        : Array.from(PACKAGE_DEFAULT_SOCKET_CATEGORIES),
      engines: engines ?? { node: constants.PACKAGE_DEFAULT_NODE_RANGE },
      version: semver.parse(
        manifestData?.version ?? constants.PACKAGE_DEFAULT_VERSION,
      ),
    },
  ]
}

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
