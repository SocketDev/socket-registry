'use strict'

const EditablePackageJson = require('@npmcli/package-json')
const normalizePackageData = require('normalize-package-data')
const npmPackageArg = require('npm-package-arg')
const semver = require('semver')

const {
  MIT,
  NPM_SCOPE,
  REPO_ORG,
  REPO_NAME,
  VERSION,
  packageExtensions
} = require('@socketregistry/scripts/constants')
const {
  isObjectObject,
  merge
} = require('@socketregistry/scripts/utils/objects')
const { escapeRegExp } = require('@socketregistry/scripts/utils/regexps')

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
      ? { engines }
      : { engines: { node: '>=18.20.4' } }),
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

function toEditablePackageJson(pkgJson, pkgJsonPath) {
  return pkgJsonPath
    ? EditablePackageJson.create(pkgJsonPath, { data: pkgJson })
    : new EditablePackageJson().fromContent(pkgJson)
}

module.exports = {
  createPackageJson,
  findPackageExtensions,
  normalizePackageJson,
  parsePackageSpec,
  toEditablePackageJson
}
