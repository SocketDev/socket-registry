'use strict'

const path = require('node:path')

const EditablePackageJson = require('@npmcli/package-json')
const cacache = require('cacache')
const fs = require('fs-extra')
const makeFetchHappen = require('make-fetch-happen')
const normalizePackageData = require('normalize-package-data')
const npmPackageArg = require('npm-package-arg')
const { PackageURL } = require('packageurl-js')
const pacote = require('pacote')
const semver = require('semver')
const spdxCorrect = require('spdx-correct')
const spdxExpParse = require('spdx-expression-parse')
const validateNpmPackageName = require('validate-npm-package-name')

const constants = require('@socketregistry/scripts/constants')
const {
  LOOP_SENTINEL,
  MIT,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES,
  PACKAGE_JSON,
  PACKAGE_SCOPE,
  REGISTRY_SCOPE_DELIMITER,
  REPO_NAME,
  REPO_ORG,
  UNLICENCED,
  UNLICENSED,
  copyLeftLicenses,
  packageExtensions,
  packumentCache,
  pacoteCachePath
} = constants
const {
  getOwnPropertyValues,
  isObject,
  isObjectObject,
  merge
} = require('@socketregistry/scripts/utils/objects')
const {
  isNodeModules,
  normalizePath
} = require('@socketregistry/scripts/utils/path')
const { escapeRegExp } = require('@socketregistry/scripts/utils/regexps')
const { isNonEmptyString } = require('@socketregistry/scripts/utils/strings')

const BINARY_OPERATION_NODE_TYPE = 'BinaryOperation'
const LICENSE_NODE_TYPE = 'License'

const escapedScopeRegExp = new RegExp(
  `^[^${escapeRegExp(REGISTRY_SCOPE_DELIMITER[0])}]+${escapeRegExp(REGISTRY_SCOPE_DELIMITER)}(?!${escapeRegExp(REGISTRY_SCOPE_DELIMITER[0])})`
)
const fileReferenceRegExp = /^SEE LICEN[CS]E IN (.+)$/
const pkgScopeRegExp = new RegExp(`^${escapeRegExp(PACKAGE_SCOPE)}/`)

const fetcher = makeFetchHappen.defaults({
  cachePath: pacoteCachePath,
  // Prefer-offline: Staleness checks for cached data will be bypassed, but
  // missing data will be requested from the server.
  // https://github.com/npm/make-fetch-happen?tab=readme-ov-file#--optscache
  cache: 'force-cache'
})

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

function createPackageJson(regPkgName, directory, options) {
  const {
    dependencies,
    description,
    engines,
    exports: entryExportsRaw,
    files,
    keywords,
    main,
    overrides,
    sideEffects,
    socket,
    type,
    version
  } = { __proto__: null, ...options }
  // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
  const { PACKAGE_DEFAULT_NODE_RANGE } = constants
  const name = `${PACKAGE_SCOPE}/${regPkgName.replace(pkgScopeRegExp, '')}`
  const entryExports = resolvePackageJsonEntryExports(entryExportsRaw)
  return {
    __proto__: null,
    name,
    version,
    license: MIT,
    description,
    keywords,
    repository: {
      type: 'git',
      url: `git+https://github.com/${REPO_ORG}/${REPO_NAME}.git`,
      directory
    },
    ...(type ? { type } : {}),
    ...(entryExports ? { exports: entryExports } : {}),
    ...(entryExports ? {} : { main: `${main ?? './index.js'}` }),
    sideEffects: sideEffects !== undefined && !!sideEffects,
    ...(isObjectObject(dependencies) ? { dependencies } : {}),
    ...(isObjectObject(overrides) ? { overrides, resolutions: overrides } : {}),
    ...(isObjectObject(engines)
      ? {
          engines: Object.fromEntries(
            Object.entries(engines).map(pair => {
              if (pair[0] === 'node') {
                const { 1: range } = pair
                if (
                  !semver.satisfies(
                    semver.coerce(range),
                    PACKAGE_DEFAULT_NODE_RANGE
                  )
                ) {
                  pair[1] = pkgScopeRegExp
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
  const { tmpPrefix, ...extractOptions } = { __proto__: null, ...options }
  await cacache.tmp.withTmp(
    pacoteCachePath,
    { tmpPrefix },
    async tmpDirPath => {
      await pacote.extract(pkgNameOrId, tmpDirPath, {
        __proto__: null,
        packumentCache,
        preferOffline: true,
        ...extractOptions
      })
      await callback(tmpDirPath)
    }
  )
}

async function fetchPackageManifest(pkgNameOrId, options) {
  const pacoteOptions = {
    __proto__: null,
    ...options,
    packumentCache,
    preferOffline: true
  }
  let result
  try {
    result = await pacote.manifest(pkgNameOrId, pacoteOptions)
  } catch {}
  if (result) {
    const spec = npmPackageArg(pkgNameOrId, pacoteOptions.where)
    const { type } = spec
    // RegistryFetcher spec.type check based on:
    // https://github.com/npm/pacote/blob/v19.0.0/lib/fetcher.js#L467-L488
    if (
      type === 'alias' ||
      type === 'range' ||
      type === 'tag' ||
      type === 'version'
    ) {
      return result
    }
  }
  return result
    ? fetchPackageManifest(`${result.name}@${result.version}`, pacoteOptions)
    : null
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

function parseSpdxExp(spdxExp) {
  try {
    return spdxExpParse(spdxExp)
  } catch {}
  const corrected = spdxCorrect(spdxExp)
  return corrected ? spdxExpParse(corrected) : null
}

async function readPackageJson(filepath, options) {
  const { editable, ...otherOptions } = { __proto__: null, ...options }
  const pkgJson = await fs.readJson(resolvePackageJsonPath(filepath))
  return editable
    ? await toEditablePackageJson(pkgJson, { path: filepath, ...otherOptions })
    : normalizePackageJson(pkgJson, otherOptions)
}

function readPackageJsonSync(filepath, options) {
  const { editable, ...otherOptions } = { __proto__: null, ...options }
  const pkgJson = fs.readJsonSync(resolvePackageJsonPath(filepath))
  return editable
    ? toEditablePackageJsonSync(pkgJson, { path: filepath, ...otherOptions })
    : normalizePackageJson(pkgJson, otherOptions)
}

function resolveEscapedScope(regPkgName) {
  return escapedScopeRegExp.exec(regPkgName)?.[0] ?? ''
}

async function resolveGitHubTgzUrl(pkgNameOrId, where) {
  const whereIsPkgJson = isObjectObject(where)
  const pkgJson = whereIsPkgJson ? where : await readPackageJson(where)
  const { version } = pkgJson
  const parsedSpec = npmPackageArg(
    pkgNameOrId,
    whereIsPkgJson ? undefined : where
  )
  const isTarballUrl =
    parsedSpec.type === 'remote' && !!parsedSpec.saveSpec?.endsWith('.tar.gz')

  if (isTarballUrl) {
    return parsedSpec.saveSpec
  }
  const isGithubUrl =
    parsedSpec.type === 'git' &&
    parsedSpec.hosted?.domain === 'github.com' &&
    isNonEmptyString(parsedSpec.gitCommittish)

  const { project, user } = isGithubUrl
    ? parsedSpec.hosted
    : getRepoUrlDetails(pkgJson.repository?.url)

  if (user && project) {
    let apiUrl = ''
    if (isGithubUrl) {
      apiUrl = gitHubTagRefUrl(user, project, parsedSpec.gitCommittish)
    } else {
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

function resolveOriginalPackageName(regPkgName) {
  const escapedScope = resolveEscapedScope(regPkgName)
  return escapedScope
    ? `${unescapeScope(escapedScope)}/${regPkgName.slice(escapedScope.length)}`
    : regPkgName
}

function resolvePackageJsonDirname(filepath) {
  return filepath.endsWith(PACKAGE_JSON) ? path.dirname(filepath) : filepath
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
  return filepath.endsWith(PACKAGE_JSON)
    ? filepath
    : path.join(filepath, PACKAGE_JSON)
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

function resolveRegistryPackageName(pkgName) {
  const purlObj = PackageURL.fromString(`pkg:npm/${pkgName}`)
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
  const pkgJsonPath = resolvePackageJsonDirname(filepath)
  return (await EditablePackageJson.load(pkgJsonPath, { create: true })).update(
    normalizePackageJson(pkgJson, {
      __proto__: null,
      ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
      ...normalizeOptions
    })
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
  const pkgJsonPath = resolvePackageJsonDirname(filepath)
  return new EditablePackageJson().create(pkgJsonPath).update(
    normalizePackageJson(pkgJson, {
      __proto__: null,
      ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
      ...normalizeOptions
    })
  )
}

function unescapeScope(escapedScope) {
  return `@${escapedScope.slice(0, -REGISTRY_SCOPE_DELIMITER.length)}`
}

function visitLicenses(ast, visitor) {
  const queue = [[createAstNode(ast), undefined]]
  let { length: queueLength } = queue
  let pos = 0
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
  findTypesForSubpath,
  getSubpaths,
  isConditionalExports,
  isSubpathExports,
  isValidPackageName,
  normalizePackageJson,
  readPackageJson,
  readPackageJsonSync,
  resolveEscapedScope,
  resolveGitHubTgzUrl,
  resolveOriginalPackageName,
  resolvePackageJsonDirname,
  resolvePackageJsonEntryExports,
  resolvePackageJsonPath,
  resolvePackageLicenses,
  resolveRegistryPackageName,
  toEditablePackageJson,
  toEditablePackageJsonSync,
  unescapeScope
}
