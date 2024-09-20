'use strict'

const EditablePackageJson = require('@npmcli/package-json')
const spawn = require('@npmcli/promise-spawn')
const normalizePackageData = require('normalize-package-data')
const npmPackageArg = require('npm-package-arg')
const semver = require('semver')
const validateNpmPackageName = require('validate-npm-package-name')

const {
  MIT,
  NPM_SCOPE,
  REPO_ORG,
  REPO_NAME,
  VERSION,
  maintainedNodeVersions,
  npmExecPath,
  packageExtensions,
  rootPath
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

async function existsInNpmRegistry(pkgName) {
  if (isValidPackageName(pkgName)) {
    try {
      await spawn(npmExecPath, ['view', pkgName, 'name'], { cwd: rootPath })
      return true
    } catch {}
  }
  return false
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
  const { preserve } = { ...options }
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
  const { path: pathOpt, ...otherOptions } = { ...options }
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
  existsInNpmRegistry,
  isValidPackageName,
  normalizePackageJson,
  parsePackageSpec,
  toEditablePackageJson
}
