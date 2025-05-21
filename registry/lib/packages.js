'use strict'

const semver = /*@__PURE__*/ require('../external/semver')

const abortSignal = /*@__PURE__*/ require('./constants/abort-signal')
const copyLeftLicenses = /*@__PURE__*/ require('./constants/copy-left-licenses')
const LOOP_SENTINEL = /*@__PURE__*/ require('./constants/loop-sentinel')
const PACKAGE_DEFAULT_SOCKET_CATEGORIES = /*@__PURE__*/ require('./constants/package-default-socket-categories')
const packumentCache = /*@__PURE__*/ require('./constants/packument-cache')
const REGISTRY_SCOPE_DELIMITER = /*@__PURE__*/ require('./constants/registry-scope-delimiter')
const SOCKET_GITHUB_ORG = /*@__PURE__*/ require('./constants/socket-github-org')
const SOCKET_REGISTRY_REPO_NAME = /*@__PURE__*/ require('./constants/socket-registry-repo-name')
const SOCKET_REGISTRY_SCOPE = /*@__PURE__*/ require('./constants/socket-registry-scope')
const { readJson, readJsonSync } = /*@__PURE__*/ require('./fs')
const {
  getOwnPropertyValues,
  isObject,
  isObjectObject,
  merge,
  objectEntries
} = /*@__PURE__*/ require('./objects')
const { isNodeModules, normalizePath } = /*@__PURE__*/ require('./path')
const { escapeRegExp } = /*@__PURE__*/ require('./regexps')
const { isNonEmptyString } = /*@__PURE__*/ require('./strings')

const BINARY_OPERATION_NODE_TYPE = 'BinaryOperation'
const LICENSE_NODE_TYPE = 'License'

const escapedScopeRegExp = new RegExp(
  `^[^${escapeRegExp(REGISTRY_SCOPE_DELIMITER[0])}]+${escapeRegExp(REGISTRY_SCOPE_DELIMITER)}(?!${escapeRegExp(REGISTRY_SCOPE_DELIMITER[0])})`
)
const fileReferenceRegExp = /^SEE LICEN[CS]E IN (.+)$/
const pkgScopePrefixRegExp = /^@socketregistry\//

const identSymbol = Symbol.for('indent')
const newlineSymbol = Symbol.for('newline')

let _cacache
/*@__NO_SIDE_EFFECTS__*/
function getCacache() {
  if (_cacache === undefined) {
    _cacache = /*@__PURE__*/ require('../external/cacache')
  }
  return _cacache
}

let _EditablePackageJsonClass
/*@__NO_SIDE_EFFECTS__*/
function getEditablePackageJsonClass() {
  if (_EditablePackageJsonClass === undefined) {
    const EditablePackageJsonBase = /*@__PURE__*/ require('../external/@npmcli/package-json')
    const {
      parse,
      read
    } = /*@__PURE__*/ require('../external/@npmcli/package-json/lib/read-package')
    const {
      packageSort
    } = /*@__PURE__*/ require('../external/@npmcli/package-json/lib/sort')
    _EditablePackageJsonClass = class EditablePackageJson extends (
      EditablePackageJsonBase
    ) {
      static fixSteps = EditablePackageJsonBase.fixSteps
      static normalizeSteps = EditablePackageJsonBase.normalizeSteps
      static prepareSteps = EditablePackageJsonBase.prepareSteps

      _canSave = true
      _path = undefined
      _readFileContent = ''
      _readFileJson = null

      static async create(path, opts = {}) {
        const p = new _EditablePackageJsonClass()
        await p.create(path)
        return opts.data ? p.update(opts.data) : p
      }

      static async fix(path, opts) {
        const p = new _EditablePackageJsonClass()
        await p.load(path, true)
        return p.fix(opts)
      }

      static async load(path, opts = {}) {
        const p = new _EditablePackageJsonClass()
        // Avoid try/catch if we aren't going to create
        if (!opts.create) {
          return await p.load(path)
        }
        try {
          return await p.load(path)
        } catch (err) {
          if (!err.message.startsWith('Could not read package.json')) {
            throw err
          }
          return await p.create(path)
        }
      }

      static async normalize(path, opts) {
        const p = new _EditablePackageJsonClass()
        await p.load(path)
        return await p.normalize(opts)
      }

      static async prepare(path, opts) {
        const p = new _EditablePackageJsonClass()
        await p.load(path, true)
        return await p.prepare(opts)
      }

      create(path) {
        super.create(path)
        this._path = path
        return this
      }

      async fix(opts = {}) {
        await super.fix(opts)
        return this
      }

      fromComment(data) {
        super.fromComment(data)
        return this
      }

      fromContent(data) {
        super.fromContent(data)
        this._canSave = false
        return this
      }

      fromJSON(data) {
        super.fromJSON(data)
        return this
      }

      async load(path, parseIndex) {
        this._path = path
        const { promises: fsPromises } = getFs()
        let parseErr
        try {
          this._readFileContent = await read(this.filename)
        } catch (err) {
          if (!parseIndex) {
            throw err
          }
          parseErr = err
        }
        if (parseErr) {
          const indexFile = path.resolve(this.path, 'index.js')
          let indexFileContent
          try {
            indexFileContent = await fsPromises.readFile(indexFile, 'utf8')
          } catch {
            throw parseErr
          }
          try {
            this.fromComment(indexFileContent)
          } catch {
            throw parseErr
          }
          // This wasn't a package.json so prevent saving
          this._canSave = false
          return this
        }
        this.fromJSON(this._readFileContent)
        // Add AFTER fromJSON is called in case it errors.
        this._readFileJson = parse(this._readFileContent)
        return this
      }

      async normalize(opts = {}) {
        await super.normalize(opts)
        return this
      }

      get path() {
        return this._path
      }

      async prepare(opts = {}) {
        await super.prepare(opts)
        return this
      }

      async save({ ignoreWhitespace = false, sort = false } = {}) {
        if (!this._canSave) {
          throw new Error('No package.json to save to')
        }
        const {
          [identSymbol]: indent,
          [newlineSymbol]: newline,
          ...rest
        } = this.content
        const content = sort ? packageSort(rest) : rest
        const {
          [identSymbol]: _indent,
          [newlineSymbol]: _newline,
          ...origContent
        } = this._readFileJson

        if (
          ignoreWhitespace &&
          getUtil().isDeepStrictEqual(content, origContent)
        ) {
          return false
        }

        const format = indent === undefined ? '  ' : indent
        const eol = newline === undefined ? '\n' : newline
        const fileContent = `${JSON.stringify(
          content,
          null,
          format
        )}\n`.replace(/\n/g, eol)

        if (
          !ignoreWhitespace &&
          fileContent.trim() === this._readFileContent.trim()
        ) {
          return false
        }

        const { promises: fsPromises } = getFs()
        await fsPromises.writeFile(this.filename, fileContent)
        this._readFileContent = fileContent
        this._readFileJson = parse(fileContent)
        return true
      }

      async saveSync({ ignoreWhitespace = false, sort = false } = {}) {
        if (!this._canSave || this.content === undefined) {
          throw new Error('No package.json to save to')
        }
        const {
          [Symbol.for('indent')]: indent,
          [Symbol.for('newline')]: newline,
          ...rest
        } = this.content
        const content = sort ? packageSort(rest) : rest

        if (
          ignoreWhitespace &&
          getUtil().isDeepStrictEqual(content, this._readFileJson)
        ) {
          return false
        }

        const format = indent === undefined ? '  ' : indent
        const eol = newline === undefined ? '\n' : newline
        const fileContent = `${JSON.stringify(
          content,
          null,
          format
        )}\n`.replace(/\n/g, eol)

        if (
          !ignoreWhitespace &&
          fileContent.trim() === this._readFileContent.trim()
        ) {
          return false
        }

        const fs = getFs()
        fs.writeFileSync(this.filename, fileContent)
        this._readFileContent = fileContent
        this._readFileJson = parse(fileContent)
        return true
      }

      update(content) {
        super.update(content)
        return this
      }
    }
  }
  return _EditablePackageJsonClass
}

let _fetcher
/*@__NO_SIDE_EFFECTS__*/
function getFetcher() {
  if (_fetcher === undefined) {
    const makeFetchHappen = /*@__PURE__*/ require('../external/make-fetch-happen')
    _fetcher = makeFetchHappen.defaults({
      cachePath: /*@__PURE__*/ require('./constants/pacote-cache-path'),
      // Prefer-offline: Staleness checks for cached data will be bypassed, but
      // missing data will be requested from the server.
      // https://github.com/npm/make-fetch-happen?tab=readme-ov-file#--optscache
      cache: 'force-cache'
    })
  }
  return _fetcher
}

let _fs
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = /*@__PURE__*/ require('fs')
  }
  return _fs
}

let _normalizePackageData
/*@__NO_SIDE_EFFECTS__*/
function getNormalizePackageData() {
  if (_normalizePackageData === undefined) {
    _normalizePackageData = /*@__PURE__*/ require('../external/normalize-package-data')
  }
  return _normalizePackageData
}

let _npmPackageArg
/*@__NO_SIDE_EFFECTS__*/
function getNpmPackageArg() {
  if (_npmPackageArg === undefined) {
    _npmPackageArg = /*@__PURE__*/ require('../external/npm-package-arg')
  }
  return _npmPackageArg
}

let _pack
/*@__NO_SIDE_EFFECTS__*/
function getPack() {
  if (_pack === undefined) {
    _pack = /*@__PURE__*/ require('../external/libnpmpack')
  }
  return _pack
}

let _PackageURL
/*@__NO_SIDE_EFFECTS__*/
function getPackageURL() {
  if (_PackageURL === undefined) {
    // The 'packageurl-js' package is browser safe.
    _PackageURL =
      /*@__PURE__*/ require('../external/@socketregistry/packageurl-js').PackageURL
  }
  return _PackageURL
}

let _pacote
/*@__NO_SIDE_EFFECTS__*/
function getPacote() {
  if (_pacote === undefined) {
    _pacote = /*@__PURE__*/ require('../external/pacote')
  }
  return _pacote
}

let _path
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path
}

let _semver
/*@__NO_SIDE_EFFECTS__*/
function getSemver() {
  if (_semver === undefined) {
    // The 'semver' package is browser safe.
    _semver = /*@__PURE__*/ require('../external/semver')
  }
  return _semver
}

let _spdxCorrect
/*@__NO_SIDE_EFFECTS__*/
function getSpdxCorrect() {
  if (_spdxCorrect === undefined) {
    // The 'spdx-correct' package is browser safe.
    _spdxCorrect = /*@__PURE__*/ require('../external/spdx-correct')
  }
  return _spdxCorrect
}

let _spdxExpParse
/*@__NO_SIDE_EFFECTS__*/
function getSpdxExpParse() {
  if (_spdxExpParse === undefined) {
    // The 'spdx-expression-parse' package is browser safe.
    _spdxExpParse = /*@__PURE__*/ require('../external/spdx-expression-parse')
  }
  return _spdxExpParse
}

let _util
/*@__NO_SIDE_EFFECTS__*/
function getUtil() {
  if (_util === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _util = /*@__PURE__*/ require('util')
  }
  return _util
}

let _validateNpmPackageName
/*@__NO_SIDE_EFFECTS__*/
function getValidateNpmPackageName() {
  if (_validateNpmPackageName === undefined) {
    _validateNpmPackageName = /*@__PURE__*/ require('../external/validate-npm-package-name')
  }
  return _validateNpmPackageName
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function collectLicenseWarnings(licenseNodes) {
  const warnings = new Map()
  for (let i = 0, { length } = licenseNodes; i < length; i += 1) {
    const node = licenseNodes[i]
    const { license } = node
    if (license === 'UNLICENSED') {
      warnings.set('UNLICENSED', `Package is unlicensed`)
    } else if (node.inFile !== undefined) {
      warnings.set('IN_FILE', `License terms specified in ${node.inFile}`)
    }
  }
  return [...warnings.values()]
}

/*@__NO_SIDE_EFFECTS__*/
function createAstNode(rawNode) {
  return Object.hasOwn(rawNode, 'license')
    ? createLicenseNode(rawNode)
    : createBinaryOperationNode(rawNode)
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function createLicenseNode(rawNode) {
  return { __proto__: null, ...rawNode, type: LICENSE_NODE_TYPE }
}

/*@__NO_SIDE_EFFECTS__*/
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
  const PACKAGE_DEFAULT_NODE_RANGE = /*@__PURE__*/ require('./constants/package-default-node-range')
  const name = `@socketregistry/${sockRegPkgName.replace(pkgScopePrefixRegExp, '')}`
  const entryExports = resolvePackageJsonEntryExports(entryExportsRaw)
  const githubUrl = `https://github.com/${SOCKET_GITHUB_ORG}/${SOCKET_REGISTRY_REPO_NAME}`
  return {
    __proto__: null,
    name,
    version,
    license: 'MIT',
    description,
    keywords,
    homepage: `${githubUrl}/tree/main/${directory}`,
    repository: {
      type: 'git',
      url: `git+${githubUrl}.git`,
      directory
    },
    ...(type ? { type } : {}),
    ...(entryExports ? { exports: { ...entryExports } } : {}),
    ...(entryExports ? {} : { main: `${main ?? './index.js'}` }),
    sideEffects: sideEffects !== undefined && !!sideEffects,
    ...(isObjectObject(dependencies)
      ? { dependencies: { ...dependencies } }
      : {}),
    ...(isObjectObject(overrides) ? { overrides: { ...overrides } } : {}),
    ...(isObjectObject(resolutions) ? { resolutions: { ...resolutions } } : {}),
    ...(isObjectObject(engines)
      ? {
          engines: Object.fromEntries(
            objectEntries(engines).map(pair => {
              if (pair[0] === 'node') {
                const semver = getSemver()
                const { 1: range } = pair
                if (
                  !semver.satisfies(
                    // Roughly check Node range as semver.coerce will strip leading
                    // v's, carets (^), comparators (<,<=,>,>=,=), and tildes (~).
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
    files: Array.isArray(files) ? files.slice() : ['*.d.ts', '*.js'],
    ...(isObjectObject(socket)
      ? { socket: { ...socket } }
      : {
          socket: {
            // Valid categories are: cleanup, levelup, speedup, tuneup
            categories: PACKAGE_DEFAULT_SOCKET_CATEGORIES
          }
        })
  }
}

/*@__NO_SIDE_EFFECTS__*/
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
      /*@__PURE__*/ require('./constants/pacote-cache-path'),
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

/*@__NO_SIDE_EFFECTS__*/
async function fetchPackageManifest(pkgNameOrId, options) {
  const pacoteOptions = {
    __proto__: null,
    signal: abortSignal,
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

/*@__NO_SIDE_EFFECTS__*/
async function fetchPackagePackument(pkgNameOrId, options) {
  const pacote = getPacote()
  try {
    return await pacote.packument(pkgNameOrId, {
      __proto__: null,
      signal: abortSignal,
      ...options,
      packumentCache,
      preferOffline: true
    })
  } catch {}
  return null
}

/*@__NO_SIDE_EFFECTS__*/
function findPackageExtensions(pkgName, pkgVer) {
  let result
  const packageExtensions = /*@__PURE__*/ require('./constants/package-extensions')
  for (const { 0: selector, 1: ext } of packageExtensions) {
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

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function getReleaseTag(version) {
  return semver.prerelease(version)?.join('.') ?? 'latest'
}

/*@__NO_SIDE_EFFECTS__*/
function getRepoUrlDetails(repoUrl = '') {
  const userAndRepo = repoUrl.replace(/^.+github.com\//, '').split('/')
  const { 0: user } = userAndRepo
  const project =
    userAndRepo.length > 1 ? userAndRepo[1].slice(0, -'.git'.length) : ''
  return { user, project }
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function gitHubTagRefUrl(user, project, tag) {
  return `https://api.github.com/repos/${user}/${project}/git/ref/tags/${tag}`
}

/*@__NO_SIDE_EFFECTS__*/
function gitHubTgzUrl(user, project, sha) {
  return `https://github.com/${user}/${project}/archive/${sha}.tar.gz`
}

/*@__NO_SIDE_EFFECTS__*/
function isBlessedPackageName(name) {
  return (
    typeof name === 'string' &&
    (name === 'socket' ||
      name.startsWith('@socketoverride/') ||
      name.startsWith('@socketregistry/') ||
      name.startsWith('@socketsecurity/'))
  )
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function isRegistryFetcherType(type) {
  // RegistryFetcher spec.type check based on:
  // https://github.com/npm/pacote/blob/v19.0.0/lib/fetcher.js#L467-L488
  return (
    type === 'alias' || type === 'range' || type === 'tag' || type === 'version'
  )
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function isValidPackageName(name) {
  const validateNpmPackageName = getValidateNpmPackageName()
  return validateNpmPackageName(name).validForOldPackages
}

/*@__NO_SIDE_EFFECTS__*/
function pkgJsonToEditable(pkgJson, options) {
  const { normalize, ...normalizeOptions } = { __proto__: null, ...options }
  const EditablePackageJson = getEditablePackageJsonClass()
  return new EditablePackageJson().fromContent(
    normalize ? normalizePackageJson(pkgJson, normalizeOptions) : pkgJson
  )
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
async function packPackage(spec, options) {
  const pack = getPack()
  return await pack(spec, {
    __proto__: null,
    signal: abortSignal,
    ...options,
    packumentCache,
    preferOffline: true
  })
}

/*@__NO_SIDE_EFFECTS__*/
function parseSpdxExp(spdxExp) {
  const spdxExpParse = getSpdxExpParse()
  try {
    return spdxExpParse(spdxExp)
  } catch {}
  const spdxCorrect = getSpdxCorrect()
  const corrected = spdxCorrect(spdxExp)
  return corrected ? spdxExpParse(corrected) : null
}

/*@__NO_SIDE_EFFECTS__*/
async function readPackageJson(filepath, options) {
  const { editable, normalize, throws, ...normalizeOptions } = {
    __proto__: null,
    ...options
  }
  const pkgJson = await readJson(resolvePackageJsonPath(filepath), { throws })
  if (pkgJson) {
    return editable
      ? await toEditablePackageJson(pkgJson, {
          path: filepath,
          normalize,
          ...normalizeOptions
        })
      : normalize
        ? normalizePackageJson(pkgJson, normalizeOptions)
        : pkgJson
  }
  return null
}

/*@__NO_SIDE_EFFECTS__*/
function readPackageJsonSync(filepath, options) {
  const { editable, normalize, throws, ...normalizeOptions } = {
    __proto__: null,
    ...options
  }
  const pkgJson = readJsonSync(resolvePackageJsonPath(filepath), { throws })
  if (pkgJson) {
    return editable
      ? toEditablePackageJsonSync(pkgJson, {
          path: filepath,
          normalize,
          ...normalizeOptions
        })
      : normalize
        ? normalizePackageJson(pkgJson, normalizeOptions)
        : pkgJson
  }
  return null
}

/*@__NO_SIDE_EFFECTS__*/
function resolveEscapedScope(sockRegPkgName) {
  return escapedScopeRegExp.exec(sockRegPkgName)?.[0] ?? ''
}

/*@__NO_SIDE_EFFECTS__*/
async function resolveGitHubTgzUrl(pkgNameOrId, where) {
  const whereIsPkgJson = isObjectObject(where)
  const pkgJson = whereIsPkgJson
    ? where
    : await readPackageJson(where, { normalize: true })
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

/*@__NO_SIDE_EFFECTS__*/
function resolveOriginalPackageName(sockRegPkgName) {
  const name = sockRegPkgName.startsWith(`${SOCKET_REGISTRY_SCOPE}/`)
    ? sockRegPkgName.slice(SOCKET_REGISTRY_SCOPE.length + 1)
    : sockRegPkgName
  const escapedScope = resolveEscapedScope(name)
  return escapedScope
    ? `${unescapeScope(escapedScope)}/${name.slice(escapedScope.length)}`
    : name
}

/*@__NO_SIDE_EFFECTS__*/
function resolvePackageJsonDirname(filepath) {
  if (filepath.endsWith('package.json')) {
    const path = getPath()
    return path.dirname(filepath)
  }
  return filepath
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function resolvePackageJsonPath(filepath) {
  if (filepath.endsWith('package.json')) {
    return filepath
  }
  const path = getPath()
  return path.join(filepath, 'package.json')
}

/*@__NO_SIDE_EFFECTS__*/
function resolvePackageLicenses(licenseFieldValue, where) {
  // Based off of validate-npm-package-license which npm, by way of normalize-package-data,
  // uses to validate license field values:
  // https://github.com/kemitchell/validate-npm-package-license.js/blob/v3.0.4/index.js#L40-L41
  if (
    licenseFieldValue === 'UNLICENSED' ||
    licenseFieldValue === 'UNLICENCED'
  ) {
    return [{ license: 'UNLICENSED' }]
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

/*@__NO_SIDE_EFFECTS__*/
function resolvePackageName(purlObj, delimiter = '/') {
  const { name, namespace } = purlObj
  return `${namespace ? `${namespace}${delimiter}` : ''}${name}`
}

/*@__NO_SIDE_EFFECTS__*/
function resolveRegistryPackageName(pkgName) {
  const purlObj = getPackageURL().fromString(`pkg:npm/${pkgName}`)
  return purlObj.namespace
    ? `${purlObj.namespace.slice(1)}${REGISTRY_SCOPE_DELIMITER}${purlObj.name}`
    : pkgName
}

/*@__NO_SIDE_EFFECTS__*/
async function toEditablePackageJson(pkgJson, options) {
  const { path: filepath, ...pkgJsonToEditableOptions } = {
    __proto__: null,
    ...options
  }
  const { normalize, ...normalizeOptions } = pkgJsonToEditableOptions
  if (typeof filepath !== 'string') {
    return pkgJsonToEditable(pkgJson, pkgJsonToEditableOptions)
  }
  const EditablePackageJson = getEditablePackageJsonClass()
  const pkgJsonPath = resolvePackageJsonDirname(filepath)
  return (
    await EditablePackageJson.load(pkgJsonPath, { create: true })
  ).fromJSON(
    `${JSON.stringify(
      normalize
        ? normalizePackageJson(pkgJson, {
            __proto__: null,
            ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
            ...normalizeOptions
          })
        : pkgJson,
      null,
      2
    )}\n`
  )
}

/*@__NO_SIDE_EFFECTS__*/
function toEditablePackageJsonSync(pkgJson, options) {
  const { path: filepath, ...pkgJsonToEditableOptions } = {
    __proto__: null,
    ...options
  }
  const { normalize, ...normalizeOptions } = pkgJsonToEditableOptions
  if (typeof filepath !== 'string') {
    return pkgJsonToEditable(pkgJson, pkgJsonToEditableOptions)
  }
  const EditablePackageJson = getEditablePackageJsonClass()
  const pkgJsonPath = resolvePackageJsonDirname(filepath)
  return new EditablePackageJson().create(pkgJsonPath).fromJSON(
    `${JSON.stringify(
      normalize
        ? normalizePackageJson(pkgJson, {
            __proto__: null,
            ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
            ...normalizeOptions
          })
        : pkgJson,
      null,
      2
    )}\n`
  )
}

/*@__NO_SIDE_EFFECTS__*/
function unescapeScope(escapedScope) {
  return `@${escapedScope.slice(0, -REGISTRY_SCOPE_DELIMITER.length)}`
}

/*@__NO_SIDE_EFFECTS__*/
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
