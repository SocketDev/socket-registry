'use strict'

const path = require('node:path')

const EditablePackageJson = require('@npmcli/package-json')
const normalizePackageData = require('normalize-package-data')
const npmPackageArg = require('npm-package-arg')
const semver = require('semver')

const {
  MAINTAINED_NODE_VERSIONS,
  MIT,
  NPM_SCOPE,
  REPO_ORG,
  REPO_NAME,
  VERSION,
  packageExtensions,
  PACKAGE_JSON
} = require('@socketregistry/scripts/constants')
const {
  isObjectObject,
  merge
} = require('@socketregistry/scripts/utils/objects')
const { escapeRegExp } = require('@socketregistry/scripts/utils/regexps')

const nodeVerPrev = MAINTAINED_NODE_VERSIONS.get('previous')

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

function normalizePackageJson(pkgJson) {
  normalizePackageData(pkgJson)
  const ext = findPackageExtensions(pkgJson.name, pkgJson.version)
  merge(pkgJson, ext)
  return pkgJson
}

function parsePackageSpec(pkgName, pkgSpec, where) {
  return npmPackageArg.resolve(pkgName, pkgSpec, where)
}

async function toEditablePackageJson(pkgJson, pkgJsonPath) {
  return pkgJsonPath
    ? (
        await EditablePackageJson.load(
          path.basename(pkgJsonPath) === PACKAGE_JSON
            ? path.dirname(pkgJsonPath)
            : pkgJsonPath,
          { create: true }
        )
      ).update(pkgJson)
    : new EditablePackageJson().fromContent(pkgJson)
}

function toEditablePackageJsonSync(pkgJson, pkgJsonPath) {
  return pkgJsonPath
    ? new EditablePackageJson()
        .create(
          path.basename(pkgJsonPath) === PACKAGE_JSON
            ? path.dirname(pkgJsonPath)
            : pkgJsonPath
        )
        .update(pkgJson)
    : new EditablePackageJson().fromContent(pkgJson)
}

module.exports = {
  createPackageJson,
  findPackageExtensions,
  normalizePackageJson,
  parsePackageSpec,
  toEditablePackageJson,
  toEditablePackageJsonSync
}
