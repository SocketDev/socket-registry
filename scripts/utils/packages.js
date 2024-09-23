'use strict'

const EditablePackageJson = require('@npmcli/package-json')
const cacache = require('cacache')
const normalizePackageData = require('normalize-package-data')
const npmPackageArg = require('npm-package-arg')
const pacote = require('pacote')
const semver = require('semver')
const validateNpmPackageName = require('validate-npm-package-name')

const { RegistryFetcher } = pacote

const {
  MIT,
  NPM_SCOPE,
  REPO_ORG,
  REPO_NAME,
  VERSION,
  maintainedNodeVersions,
  packageExtensions,
  packumentCache,
  pacoteCachePath
} = require('@socketregistry/scripts/constants')
const {
  isObjectObject,
  merge
} = require('@socketregistry/scripts/utils/objects')
const {
  resolvePackageJsonDirname,
  isNodeModules
} = require('@socketregistry/scripts/utils/path')
const { escapeRegExp } = require('@socketregistry/scripts/utils/regexps')

const nodeVerPrev = maintainedNodeVersions.get('previous')

function createPackageJson(pkgName, directory, options = {}) {
  const {
    browser,
    engines,
    dependencies,
    files,
    main,
    overrides,
    sideEffects,
    socket,
    version = VERSION
  } = options
  const name = `${NPM_SCOPE}/${pkgName.replace(new RegExp(`^${escapeRegExp(NPM_SCOPE)}/`), '')}`
  const nodeRange = `>=${nodeVerPrev}`
  return {
    name,
    version,
    license: MIT,
    repository: {
      type: 'git',
      url: `https://github.com/${REPO_ORG}/${REPO_NAME}`,
      directory
    },
    ...(browser ? { browser: './index.js' } : {}),
    main: `${main ?? './index.js'}`,
    sideEffects: sideEffects !== undefined && !!sideEffects,
    ...(isObjectObject(dependencies) ? { dependencies } : {}),
    ...(isObjectObject(overrides) ? { overrides, resolutions: overrides } : {}),
    ...(isObjectObject(engines)
      ? {
          engines: Object.fromEntries(
            Object.entries(engines).map(pair => {
              if (pair[0] === 'node') {
                const { 1: range } = pair
                if (!semver.satisfies(semver.coerce(range), nodeRange)) {
                  pair[1] = nodeRange
                }
              }
              return pair
            })
          )
        }
      : { engines: { node: nodeRange } }),
    files: Array.isArray(files) ? files : ['*.d.ts', '*.js'],
    ...(isObjectObject(socket)
      ? { socket }
      : { socket: { category: 'cleanup' } })
  }
}

async function extractPackage(pkgSpecRaw, options, callback) {
  if (arguments.length === 2 && typeof options === 'function') {
    callback = options
    options = {}
  }
  const { tmpPrefix, ...otherOptions } = { __proto__: null, ...options }
  cacache.tmp.withTmp(pacoteCachePath, { tmpPrefix }, async tmpDirPath => {
    await pacote.extract(pkgSpecRaw, tmpDirPath, {
      __proto__: null,
      packumentCache,
      ...otherOptions
    })
    await callback(tmpDirPath)
  })
}

async function fetchPackageManifest(pkgSpecRaw, options) {
  const { where, ...otherOptions } = { __proto__: null, ...options }
  try {
    const spec = npmPackageArg(pkgSpecRaw, where)
    const fetcher = new RegistryFetcher(spec.subSpec || spec, {
      __proto__: null,
      packumentCache,
      ...otherOptions
    })
    return await fetcher.manifest()
  } catch {}
  return null
}

function findPackageExtensions(pkgName, pkgVer) {
  let result
  for (const { 0: selector, 1: ext } of packageExtensions) {
    const lastAtSignIndex = selector.lastIndexOf('@')
    const name = selector.slice(0, lastAtSignIndex)
    if (pkgName === name) {
      const range = selector.slice(lastAtSignIndex + 1)
      if (semver.satisfies(pkgVer, range)) {
        if (result === undefined) {
          result = {}
        }
        merge(result, ext)
      }
    }
  }
  return result
}

function isValidPackageName(pkgName) {
  const validation = validateNpmPackageName(pkgName)
  return (
    validation.validForNewPackages || validation.validForOldPackages || false
  )
}

function jsonToEditablePackageJson(pkgJson, options) {
  return new EditablePackageJson().fromContent(
    normalizePackageJson(pkgJson, options)
  )
}

function normalizePackageJson(pkgJson, options) {
  const { preserve } = { __proto__: null, ...options }
  const preserved = [
    ['_id', undefined],
    ['readme', undefined],
    ...(Object.hasOwn(pkgJson, 'bugs') ? [] : [['bugs', undefined]]),
    ...(Object.hasOwn(pkgJson, 'homepage') ? [] : [['homepage', undefined]]),
    ...(Object.hasOwn(pkgJson, 'name') ? [] : [['name', undefined]]),
    ...(Object.hasOwn(pkgJson, 'version') ? [] : [['version', undefined]]),
    ...(Array.isArray(preserve)
      ? preserve.map(k => [
          k,
          Object.hasOwn(pkgJson, k) ? pkgJson[k] : undefined
        ])
      : [])
  ]
  normalizePackageData(pkgJson)
  merge(pkgJson, findPackageExtensions(pkgJson.name, pkgJson.version))
  // Revert/remove properties we don't care to have normalized.
  // Properties with undefined values are omitted when saved as JSON.
  for (const { 0: key, 1: value } of preserved) {
    pkgJson[key] = value
  }
  return pkgJson
}

function parsePackageSpec(pkgName, pkgSpec, where) {
  return npmPackageArg.resolve(pkgName, pkgSpec, where)
}

async function toEditablePackageJson(pkgJson, options) {
  const { path: pathOpt, ...otherOptions } = { __proto__: null, ...options }
  if (typeof pathOpt !== 'string') {
    return jsonToEditablePackageJson(pkgJson, otherOptions)
  }
  const pkgJsonPath = resolvePackageJsonDirname(pathOpt)
  const normalizeOptions = {
    ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
    ...otherOptions
  }
  return (await EditablePackageJson.load(pkgJsonPath, { create: true })).update(
    normalizePackageJson(pkgJson, normalizeOptions)
  )
}

module.exports = {
  createPackageJson,
  extractPackage,
  fetchPackageManifest,
  isValidPackageName,
  normalizePackageJson,
  parsePackageSpec,
  toEditablePackageJson
}
