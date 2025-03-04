'use strict'

const semver = require('semver')

const constants = require('./constants')
const { readJson, readJsonSync } = require('./fs')
const {
  getOwnPropertyValues,
  isObject,
  isObjectObject,
  merge,
  objectEntries,
  objectFromEntries
} = require('./objects')
const { isNodeModules, normalizePath } = require('./path')
const { escapeRegExp } = require('./regexps')
const { isNonEmptyString } = require('./strings')

const {
  LATEST,
  LOOP_SENTINEL,
  MIT,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES,
  PACKAGE_JSON,
  REGISTRY_SCOPE_DELIMITER,
  SOCKET_GITHUB_ORG,
  SOCKET_OVERRIDE_SCOPE,
  SOCKET_REGISTRY_REPO_NAME,
  SOCKET_REGISTRY_SCOPE,
  SOCKET_SECURITY_SCOPE,
  UNLICENCED,
  UNLICENSED,
  copyLeftLicenses,
  packumentCache
} = constants

const BINARY_OPERATION_NODE_TYPE = 'BinaryOperation'
const LICENSE_NODE_TYPE = 'License'

const escapedScopeRegExp = new RegExp(
  `^[^${escapeRegExp(REGISTRY_SCOPE_DELIMITER[0])}]+${escapeRegExp(REGISTRY_SCOPE_DELIMITER)}(?!${escapeRegExp(REGISTRY_SCOPE_DELIMITER[0])})`
)
const fileReferenceRegExp = /^SEE LICEN[CS]E IN (.+)$/
const pkgScopePrefixRegExp = new RegExp(
  `^${escapeRegExp(SOCKET_REGISTRY_SCOPE)}/`
)

let _cacache
function getCacache() {
  if (_cacache === undefined) {
    _cacache = require('cacache')
  }
  return _cacache
}

let _fetcher
function getFetcher() {
  if (_fetcher === undefined) {
    const makeFetchHappen = require('make-fetch-happen')
    _fetcher = makeFetchHappen.defaults({
      // Lazily access constants.pacoteCachePath.
      cachePath: constants.pacoteCachePath,
      // Prefer-offline: Staleness checks for cached data will be bypassed, but
      // missing data will be requested from the server.
      // https://github.com/npm/make-fetch-happen?tab=readme-ov-file#--optscache
      cache: 'force-cache'
    })
  }
  return _fetcher
}

let _fs
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = require('fs')
  }
  return _fs
}

let _normalizePackageData
function getNormalizePackageData() {
  if (_normalizePackageData === undefined) {
    _normalizePackageData = require('normalize-package-data')
  }
  return _normalizePackageData
}

let _npmPackageArg
function getNpmPackageArg() {
  if (_npmPackageArg === undefined) {
    _npmPackageArg = require('npm-package-arg')
  }
  return _npmPackageArg
}

let _pack
function getPack() {
  if (_pack === undefined) {
    _pack = require('libnpmpack')
  }
  return _pack
}

let _PackageURL
function getPackageURL() {
  if (_PackageURL === undefined) {
    // The 'packageurl-js' package is browser safe.
    _PackageURL = require('@socketregistry/packageurl-js').PackageURL
  }
  return _PackageURL
}

let _pacote
function getPacote() {
  if (_pacote === undefined) {
    _pacote = require('pacote')
  }
  return _pacote
}

let _path
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = require('path')
  }
  return _path
}

let _semver
function getSemver() {
  if (_semver === undefined) {
    // The 'semver' package is browser safe.
    _semver = require('semver')
  }
  return _semver
}

let _spdxCorrect
function getSpdxCorrect() {
  if (_spdxCorrect === undefined) {
    // The 'spdx-correct' package is browser safe.
    _spdxCorrect = require('spdx-correct')
  }
  return _spdxCorrect
}

let _spdxExpParse
function getSpdxExpParse() {
  if (_spdxExpParse === undefined) {
    // The 'spdx-expression-parse' package is browser safe.
    _spdxExpParse = require('spdx-expression-parse')
  }
  return _spdxExpParse
}

let _validateNpmPackageName
function getValidateNpmPackageName() {
  if (_validateNpmPackageName === undefined) {
    _validateNpmPackageName = require('validate-npm-package-name')
  }
  return _validateNpmPackageName
}

let _EditablePackageJsonClass
function getEditablePackageJsonClass() {
  if (_EditablePackageJsonClass === undefined) {
    const EditablePackageJsonBase = require('@npmcli/package-json')
    _EditablePackageJsonClass = class EditablePackageJson extends (
      EditablePackageJsonBase
    ) {
      #_canSave = true

      fromContent(data) {
        super.fromContent(data)
        this.#_canSave = false
        return this
      }

      async saveSync() {
        if (!this.#_canSave || this.content === undefined) {
          throw new Error('No package.json to save to')
        }
        const {
          [Symbol.for('indent')]: indent,
          [Symbol.for('newline')]: newline
        } = this.content
        const format = indent === undefined ? '  ' : indent
        const eol = newline === undefined ? '\n' : newline
        let fileContent = `${JSON.stringify(this.content, null, format)}\n`
        if (eol !== '\n') {
          fileContent = fileContent.replace(/\n/g, eol)
        }
        const fs = getFs()
        fs.writeFileSync(this.filename, fileContent)
      }
    }
  }
  return _EditablePackageJsonClass
}

function collectIncompatibleLicenses(licenseNodes) {
  const result = []
  for (let i = 0, { length } = licenseNodes; i < length; i += 1) {
    const node = licenseNodes[i]
    if (copyLeftLicenses.has(node.license)) {
      result.push(node)
    }
  }
  return result
}

function collectLicenseWarnings(licenseNodes) {
  const warnings = new Map()
  for (let i = 0, { length } = licenseNodes; i < length; i += 1) {
    const node = licenseNodes[i]
    const { license } = node
    if (license === UNLICENSED) {
      warnings.set(UNLICENSED, `Package is unlicensed`)
    } else if (node.inFile !== undefined) {
      warnings.set('IN_FILE', `License terms specified in ${node.inFile}`)
    }
  }
  return [...warnings.values()]
}

function createAstNode(rawNode) {
  return Object.hasOwn(rawNode, 'license')
    ? createLicenseNode(rawNode)
    : createBinaryOperationNode(rawNode)
}

function createBinaryOperationNode(rawNode) {
  let left
  let right
  let { left: rawLeft, right: rawRight } = rawNode
  const { conjunction } = rawNode
  rawNode = undefined
  return {
    __proto__: null,
    type: BINARY_OPERATION_NODE_TYPE,
    get left() {
      if (left === undefined) {
        left = createAstNode(rawLeft)
        rawLeft = undefined
      }
      return left
    },
    conjunction,
    get right() {
      if (right === undefined) {
        right = createAstNode(rawRight)
        rawRight = undefined
      }
      return right
    }
  }
}

function createLicenseNode(rawNode) {
  return { __proto__: null, ...rawNode, type: LICENSE_NODE_TYPE }
}

function createPackageJson(sockRegPkgName, directory, options) {
  const {
    dependencies,
    description,
    engines,
    exports: entryExportsRaw,
    files,
    keywords,
    main,
    overrides,
    resolutions,
    sideEffects,
    socket,
    type,
    version
  } = { __proto__: null, ...options }
  // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
  const { PACKAGE_DEFAULT_NODE_RANGE } = constants
  const name = `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName.replace(pkgScopePrefixRegExp, '')}`
  const entryExports = resolvePackageJsonEntryExports(entryExportsRaw)
  const githubUrl = `https://github.com/${SOCKET_GITHUB_ORG}/${SOCKET_REGISTRY_REPO_NAME}`
  return {
    __proto__: null,
    name,
    version,
    license: MIT,
    description,
    keywords,
    homepage: `${githubUrl}/tree/main/${directory}`,
    repository: {
      type: 'git',
      url: `git+${githubUrl}.git`,
      directory
    },
    ...(type ? { type } : {}),
    ...(entryExports ? { exports: entryExports } : {}),
    ...(entryExports ? {} : { main: `${main ?? './index.js'}` }),
    sideEffects: sideEffects !== undefined && !!sideEffects,
    ...(isObjectObject(dependencies) ? { dependencies } : {}),
    ...(isObjectObject(overrides) ? { overrides } : {}),
    ...(isObjectObject(resolutions) ? { resolutions } : {}),
    ...(isObjectObject(engines)
      ? {
          engines: objectFromEntries(
            objectEntries(engines).map(pair => {
              if (pair[0] === 'node') {
                const semver = getSemver()
                const { 1: range } = pair
                if (
                  !semver.satisfies(
                    semver.coerce(range),
                    PACKAGE_DEFAULT_NODE_RANGE
                  )
                ) {
                  pair[1] = PACKAGE_DEFAULT_NODE_RANGE
                }
              }
              return pair
            })
          )
        }
      : { engines: { node: PACKAGE_DEFAULT_NODE_RANGE } }),
    files: Array.isArray(files) ? files : ['*.d.ts', '*.js'],
    ...(isObjectObject(socket)
      ? { socket }
      : {
          socket: {
            // Valid categories are: cleanup, levelup, speedup, tuneup
            categories: PACKAGE_DEFAULT_SOCKET_CATEGORIES
          }
        })
  }
}

async function extractPackage(pkgNameOrId, options, callback) {
  if (arguments.length === 2 && typeof options === 'function') {
    callback = options
    options = undefined
  }
  const { dest, tmpPrefix, ...extractOptions_ } = {
    __proto__: null,
    ...options
  }
  const extractOptions = {
    __proto__: null,
    packumentCache,
    preferOffline: true,
    ...extractOptions_
  }
  const pacote = getPacote()
  if (typeof dest === 'string') {
    await pacote.extract(pkgNameOrId, dest, extractOptions)
    if (typeof callback === 'function') {
      await callback(dest)
    }
  } else {
    // The DefinitelyTyped types for cacache.tmp.withTmp are incorrect.
    // It DOES returns a promise.
    const cacache = getCacache()
    await cacache.tmp.withTmp(
      // Lazily access constants.pacoteCachePath.
      constants.pacoteCachePath,
      { tmpPrefix },
      async tmpDirPath => {
        await pacote.extract(pkgNameOrId, tmpDirPath, extractOptions)
        if (typeof callback === 'function') {
          await callback(tmpDirPath)
        }
      }
    )
  }
}

async function fetchPackageManifest(pkgNameOrId, options) {
  const pacoteOptions = {
    __proto__: null,
    ...options,
    packumentCache,
    preferOffline: true
  }
  const { signal } = pacoteOptions
  if (signal?.aborted) {
    return null
  }
  const pacote = getPacote()
  let result
  try {
    result = await pacote.manifest(pkgNameOrId, pacoteOptions)
  } catch {}
  if (signal?.aborted) {
    return null
  }
  if (result) {
    const npmPackageArg = getNpmPackageArg()
    const spec = npmPackageArg(pkgNameOrId, pacoteOptions.where)
    if (isRegistryFetcherType(spec.type)) {
      return result
    }
  }
  // Convert a manifest not fetched by RegistryFetcher to one that is.
  return result
    ? fetchPackageManifest(`${result.name}@${result.version}`, pacoteOptions)
    : null
}

async function fetchPackagePackument(pkgNameOrId, options) {
  const pacote = getPacote()
  try {
    return await pacote.packument(pkgNameOrId, {
      __proto__: null,
      ...options,
      packumentCache,
      preferOffline: true
    })
  } catch {}
  return null
}

function findPackageExtensions(pkgName, pkgVer) {
  let result
  // Lazily access constants.packageExtensions.
  for (const { 0: selector, 1: ext } of constants.packageExtensions) {
    const lastAtSignIndex = selector.lastIndexOf('@')
    const name = selector.slice(0, lastAtSignIndex)
    if (pkgName === name) {
      const semver = getSemver()
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

function findTypesForSubpath(entryExports, subpath) {
  const queue = [entryExports]
  let pos = 0
  while (pos < queue.length) {
    if (pos === LOOP_SENTINEL) {
      throw new Error(
        'Detected infinite loop in entry exports crawl of getTypesForSubpath'
      )
    }
    const value = queue[pos++]
    if (Array.isArray(value)) {
      for (let i = 0, { length } = value; i < length; i += 1) {
        const item = value[i]
        if (item === subpath) {
          return value.types
        }
        if (isObject(item)) {
          queue.push(item)
        }
      }
    } else if (isObject(value)) {
      const keys = Object.getOwnPropertyNames(value)
      for (let i = 0, { length } = keys; i < length; i += 1) {
        const item = value[keys[i]]
        if (item === subpath) {
          return value.types
        }
        if (isObject(item)) {
          queue.push(item)
        }
      }
    }
  }
  return undefined
}

function getReleaseTag(version) {
  return semver.prerelease(version)?.join('.') ?? LATEST
}

function getRepoUrlDetails(repoUrl = '') {
  const userAndRepo = repoUrl.replace(/^.+github.com\//, '').split('/')
  const { 0: user } = userAndRepo
  const project =
    userAndRepo.length > 1 ? userAndRepo[1].slice(0, -'.git'.length) : ''
  return { user, project }
}

function getSubpaths(entryExports) {
  const result = []
  const queue = getOwnPropertyValues(entryExports)
  let pos = 0
  while (pos < queue.length) {
    if (pos === LOOP_SENTINEL) {
      throw new Error(
        'Detected infinite loop in entry exports crawl of getSubpaths'
      )
    }
    const value = queue[pos++]
    if (typeof value === 'string') {
      result.push(value)
    } else if (Array.isArray(value)) {
      queue.push(...value)
    } else if (isObject(value)) {
      queue.push(...getOwnPropertyValues(value))
    }
  }
  return result
}

function gitHubTagRefUrl(user, project, tag) {
  return `https://api.github.com/repos/${user}/${project}/git/ref/tags/${tag}`
}

function gitHubTgzUrl(user, project, sha) {
  return `https://github.com/${user}/${project}/archive/${sha}.tar.gz`
}

function isBlessedPackageName(name) {
  return (
    typeof name === 'string' &&
    (name === 'socket' ||
      name.startsWith(`@${SOCKET_OVERRIDE_SCOPE}/`) ||
      name.startsWith(`@${SOCKET_REGISTRY_SCOPE}/`) ||
      name.startsWith(`@${SOCKET_SECURITY_SCOPE}/`))
  )
}

function isConditionalExports(entryExports) {
  if (!isObjectObject(entryExports)) {
    return false
  }
  const keys = Object.getOwnPropertyNames(entryExports)
  const { length } = keys
  if (!length) {
    return false
  }
  // Conditional entry exports do NOT contain keys starting with '.'.
  // Entry exports cannot contain some keys starting with '.' and some not.
  // The exports object MUST either be an object of package subpath keys OR
  // an object of main entry condition name keys only.
  for (let i = 0; i < length; i += 1) {
    const key = keys[i]
    if (key.length > 0 && key.charCodeAt(0) === 46 /*'.'*/) {
      return false
    }
  }
  return true
}

function isGitHubTgzSpec(spec, where) {
  let parsedSpec
  if (isObjectObject(spec)) {
    parsedSpec = spec
  } else {
    const npmPackageArg = getNpmPackageArg()
    parsedSpec = npmPackageArg(spec, where)
  }
  return (
    parsedSpec.type === 'remote' && !!parsedSpec.saveSpec?.endsWith('.tar.gz')
  )
}

function isGitHubUrlSpec(spec, where) {
  let parsedSpec
  if (isObjectObject(spec)) {
    parsedSpec = spec
  } else {
    const npmPackageArg = getNpmPackageArg()
    parsedSpec = npmPackageArg(spec, where)
  }
  return (
    parsedSpec.type === 'git' &&
    parsedSpec.hosted?.domain === 'github.com' &&
    isNonEmptyString(parsedSpec.gitCommittish)
  )
}

function isRegistryFetcherType(type) {
  // RegistryFetcher spec.type check based on:
  // https://github.com/npm/pacote/blob/v19.0.0/lib/fetcher.js#L467-L488
  return (
    type === 'alias' || type === 'range' || type === 'tag' || type === 'version'
  )
}

function isSubpathExports(entryExports) {
  if (isObjectObject(entryExports)) {
    const keys = Object.getOwnPropertyNames(entryExports)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      // Subpath entry exports contain keys starting with '.'.
      // Entry exports cannot contain some keys starting with '.' and some not.
      // The exports object MUST either be an object of package subpath keys OR
      // an object of main entry condition name keys only.
      if (keys[i].charCodeAt(0) === 46 /*'.'*/) {
        return true
      }
    }
  }
  return false
}

function isValidPackageName(name) {
  const validateNpmPackageName = getValidateNpmPackageName()
  return validateNpmPackageName(name).validForOldPackages
}

function jsonToEditablePackageJson(pkgJson, options) {
  const EditablePackageJson = getEditablePackageJsonClass()
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
  const normalizePackageData = getNormalizePackageData()
  normalizePackageData(pkgJson)
  merge(pkgJson, findPackageExtensions(pkgJson.name, pkgJson.version))
  // Revert/remove properties we don't care to have normalized.
  // Properties with undefined values are omitted when saved as JSON.
  for (const { 0: key, 1: value } of preserved) {
    pkgJson[key] = value
  }
  return pkgJson
}

async function packPackage(spec, options) {
  const pack = getPack()
  return await pack(spec, {
    __proto__: null,
    ...options,
    packumentCache,
    preferOffline: true
  })
}

function parseSpdxExp(spdxExp) {
  const spdxExpParse = getSpdxExpParse()
  try {
    return spdxExpParse(spdxExp)
  } catch {}
  const spdxCorrect = getSpdxCorrect()
  const corrected = spdxCorrect(spdxExp)
  return corrected ? spdxExpParse(corrected) : null
}

async function readPackageJson(filepath, options) {
  const { editable, ...otherOptions } = { __proto__: null, ...options }
  const pkgJson = await readJson(resolvePackageJsonPath(filepath))
  return editable
    ? await toEditablePackageJson(pkgJson, { path: filepath, ...otherOptions })
    : normalizePackageJson(pkgJson, otherOptions)
}

function readPackageJsonSync(filepath, options) {
  const { editable, ...otherOptions } = { __proto__: null, ...options }
  const pkgJson = readJsonSync(resolvePackageJsonPath(filepath))
  return editable
    ? toEditablePackageJsonSync(pkgJson, { path: filepath, ...otherOptions })
    : normalizePackageJson(pkgJson, otherOptions)
}

function resolveEscapedScope(sockRegPkgName) {
  return escapedScopeRegExp.exec(sockRegPkgName)?.[0] ?? ''
}

async function resolveGitHubTgzUrl(pkgNameOrId, where) {
  const whereIsPkgJson = isObjectObject(where)
  const pkgJson = whereIsPkgJson ? where : await readPackageJson(where)
  const { version } = pkgJson
  const npmPackageArg = getNpmPackageArg()
  const parsedSpec = npmPackageArg(
    pkgNameOrId,
    whereIsPkgJson ? undefined : where
  )
  const isTarballUrl = isGitHubTgzSpec(parsedSpec)
  if (isTarballUrl) {
    return parsedSpec.saveSpec
  }
  const isGitHubUrl = isGitHubUrlSpec(parsedSpec)
  const { project, user } = isGitHubUrl
    ? parsedSpec.hosted
    : getRepoUrlDetails(pkgJson.repository?.url)

  if (user && project) {
    let apiUrl = ''
    if (isGitHubUrl) {
      apiUrl = gitHubTagRefUrl(user, project, parsedSpec.gitCommittish)
    } else {
      const fetcher = getFetcher()
      // First try to resolve the sha for a tag starting with "v", e.g. v1.2.3.
      apiUrl = gitHubTagRefUrl(user, project, `v${version}`)
      if (!(await fetcher(apiUrl, { method: 'head' })).ok) {
        // If a sha isn't found, try again with the "v" removed, e.g. 1.2.3.
        apiUrl = gitHubTagRefUrl(user, project, version)
        if (!(await fetcher(apiUrl, { method: 'head' })).ok) {
          apiUrl = ''
        }
      }
    }
    if (apiUrl) {
      const fetcher = getFetcher()
      const resp = await fetcher(apiUrl)
      const json = await resp.json()
      const sha = json?.object?.sha
      if (sha) {
        return gitHubTgzUrl(user, project, sha)
      }
    }
  }
  return ''
}

function resolveOriginalPackageName(sockRegPkgName) {
  const name = sockRegPkgName.startsWith(`${SOCKET_REGISTRY_SCOPE}/`)
    ? sockRegPkgName.slice(SOCKET_REGISTRY_SCOPE.length + 1)
    : sockRegPkgName
  const escapedScope = resolveEscapedScope(name)
  return escapedScope
    ? `${unescapeScope(escapedScope)}/${name.slice(escapedScope.length)}`
    : name
}

function resolvePackageJsonDirname(filepath) {
  if (filepath.endsWith(PACKAGE_JSON)) {
    const path = getPath()
    return path.dirname(filepath)
  }
  return filepath
}

function resolvePackageJsonEntryExports(entryExports) {
  // If conditional exports main sugar
  // https://nodejs.org/api/packages.html#exports-sugar
  if (typeof entryExports === 'string' || Array.isArray(entryExports)) {
    return { '.': entryExports }
  }
  if (isConditionalExports(entryExports)) {
    return entryExports
  }
  return isObject(entryExports) ? entryExports : undefined
}

function resolvePackageJsonPath(filepath) {
  if (filepath.endsWith(PACKAGE_JSON)) {
    return filepath
  }
  const path = getPath()
  return path.join(filepath, PACKAGE_JSON)
}

function resolvePackageLicenses(licenseFieldValue, where) {
  // Based off of validate-npm-package-license which npm, by way of normalize-package-data,
  // uses to validate license field values:
  // https://github.com/kemitchell/validate-npm-package-license.js/blob/v3.0.4/index.js#L40-L41
  if (licenseFieldValue === UNLICENSED || licenseFieldValue === UNLICENCED) {
    return [{ license: UNLICENSED }]
  }
  // Match "SEE LICENSE IN <relativeFilepathToLicense>"
  // https://github.com/kemitchell/validate-npm-package-license.js/blob/v3.0.4/index.js#L48-L53
  const match = fileReferenceRegExp.exec(licenseFieldValue)
  if (match) {
    const path = getPath()
    return [
      {
        license: licenseFieldValue,
        inFile: normalizePath(path.relative(where, match[1]))
      }
    ]
  }
  const licenseNodes = []
  const ast = parseSpdxExp(licenseFieldValue)
  if (ast) {
    // SPDX expressions are valid, too except if they contain "LicenseRef" or
    // "DocumentRef". If the licensing terms cannot be described with standardized
    // SPDX identifiers, then the terms should be put in a file in the package
    // and the license field should point users there, e.g. "SEE LICENSE IN LICENSE.txt".
    // https://github.com/kemitchell/validate-npm-package-license.js/blob/v3.0.4/index.js#L18-L24
    visitLicenses(ast, {
      __proto__: null,
      License(node) {
        const { license } = node
        if (
          license.startsWith('LicenseRef') ||
          license.startsWith('DocumentRef')
        ) {
          licenseNodes.length = 0
          return false
        }
        licenseNodes.push(node)
      }
    })
  }
  return licenseNodes
}

/*#__PURE__*/
function resolvePackageName(purlObj, delimiter = '/') {
  const { name, namespace } = purlObj
  return `${namespace ? `${namespace}${delimiter}` : ''}${name}`
}

function resolveRegistryPackageName(pkgName) {
  const purlObj = getPackageURL().fromString(`pkg:npm/${pkgName}`)
  return purlObj.namespace
    ? `${purlObj.namespace.slice(1)}${REGISTRY_SCOPE_DELIMITER}${purlObj.name}`
    : pkgName
}

async function toEditablePackageJson(pkgJson, options) {
  const { path: filepath, ...normalizeOptions } = {
    __proto__: null,
    ...options
  }
  if (typeof filepath !== 'string') {
    return jsonToEditablePackageJson(pkgJson, normalizeOptions)
  }
  const EditablePackageJson = getEditablePackageJsonClass()
  const pkgJsonPath = resolvePackageJsonDirname(filepath)
  return (
    await EditablePackageJson.load(pkgJsonPath, { create: true })
  ).fromJSON(
    `${JSON.stringify(
      normalizePackageJson(pkgJson, {
        __proto__: null,
        ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
        ...normalizeOptions
      }),
      null,
      2
    )}\n`
  )
}

function toEditablePackageJsonSync(pkgJson, options) {
  const { path: filepath, ...normalizeOptions } = {
    __proto__: null,
    ...options
  }
  if (typeof filepath !== 'string') {
    return jsonToEditablePackageJson(pkgJson, normalizeOptions)
  }
  const EditablePackageJson = getEditablePackageJsonClass()
  const pkgJsonPath = resolvePackageJsonDirname(filepath)
  return new EditablePackageJson().create(pkgJsonPath).fromJSON(
    `${JSON.stringify(
      normalizePackageJson(pkgJson, {
        __proto__: null,
        ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
        ...normalizeOptions
      }),
      null,
      2
    )}\n`
  )
}

function unescapeScope(escapedScope) {
  return `@${escapedScope.slice(0, -REGISTRY_SCOPE_DELIMITER.length)}`
}

function visitLicenses(ast, visitor) {
  const queue = [[createAstNode(ast), undefined]]
  let pos = 0
  let { length: queueLength } = queue
  while (pos < queueLength) {
    if (pos === LOOP_SENTINEL) {
      throw new Error('Detected infinite loop in ast crawl of visitLicenses')
    }
    // AST nodes can be a license node which looks like
    //   {
    //     license: string
    //     plus?: boolean
    //     exception?: string
    //   }
    // or a binary operation node which looks like
    //   {
    //     left: License | BinaryOperation
    //     conjunction: string
    //     right: License | BinaryOperation
    //   }
    const { 0: node, 1: parent } = queue[pos++]
    const { type } = node
    if (visitor[type]?.(node, parent) === false) {
      break
    }
    if (type === BINARY_OPERATION_NODE_TYPE) {
      queue[queueLength++] = [node.left, node]
      queue[queueLength++] = [node.right, node]
    }
  }
}

module.exports = {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  createPackageJson,
  extractPackage,
  fetchPackageManifest,
  fetchPackagePackument,
  findTypesForSubpath,
  getReleaseTag,
  getRepoUrlDetails,
  getSubpaths,
  isBlessedPackageName,
  isConditionalExports,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
  isSubpathExports,
  isValidPackageName,
  normalizePackageJson,
  packPackage,
  readPackageJson,
  readPackageJsonSync,
  resolveEscapedScope,
  resolveGitHubTgzUrl,
  resolveOriginalPackageName,
  resolvePackageJsonDirname,
  resolvePackageJsonEntryExports,
  resolvePackageJsonPath,
  resolvePackageLicenses,
  resolvePackageName,
  resolveRegistryPackageName,
  toEditablePackageJson,
  toEditablePackageJsonSync,
  unescapeScope
}
