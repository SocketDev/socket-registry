/**
 * @fileoverview Package registry management with Socket.dev specific utilities.
 * Provides npm package analysis, dependency resolution, and registry operations.
 */

import { createCompositeAbortSignal, createTimeoutSignal } from './abort'
import LOOP_SENTINEL from './constants/LOOP_SENTINEL'
import NPM_REGISTRY_URL from './constants/NPM_REGISTRY_URL'
import REGISTRY_SCOPE_DELIMITER from './constants/REGISTRY_SCOPE_DELIMITER'
import SOCKET_GITHUB_ORG from './constants/SOCKET_GITHUB_ORG'
import SOCKET_REGISTRY_REPO_NAME from './constants/SOCKET_REGISTRY_REPO_NAME'
import SOCKET_REGISTRY_SCOPE from './constants/SOCKET_REGISTRY_SCOPE'
import abortSignal from './constants/abort-signal'
import copyLeftLicenses from './constants/copy-left-licenses'
import packageDefaultNodeRange from './constants/package-default-node-range'
import PACKAGE_DEFAULT_SOCKET_CATEGORIES from './constants/package-default-socket-categories'
import packageExtensions from './constants/package-extensions'
import packumentCache from './constants/packument-cache'
import pacoteCachePath from './constants/pacote-cache-path'
import { readJson, readJsonSync } from './fs'
import { isObject, isObjectObject, merge, objectEntries } from './objects'
import { isNodeModules, normalizePath } from './path'
import { escapeRegExp } from './regexps'
import { isNonEmptyString } from './strings'
import { parseUrl } from './url'

import type { CategoryString } from '../index'

// Type for package.json exports field.
type PackageExports = {
  [path: string]: unknown
}

export type PackageJson = {
  [key: string]: unknown
  name?: string | undefined
  version?: string | undefined
  dependencies?: Record<string, string> | undefined
  devDependencies?: Record<string, string> | undefined
  peerDependencies?: Record<string, string> | undefined
  optionalDependencies?: Record<string, string> | undefined
  overrides?: Record<string, string> | undefined
  resolutions?: Record<string, string> | undefined
  exports?: PackageExports | string | string[] | undefined
  socket?: { categories?: CategoryString } | undefined
}

export type SaveOptions = {
  ignoreWhitespace?: boolean | undefined
  sort?: boolean | undefined
}

export type EditablePackageJsonOptions = {
  normalize?: boolean | undefined
  path?: string | undefined
  preserve?: string[] | readonly string[] | undefined
  create?: boolean | undefined
  data?: PackageJson | undefined
}

export type ExtractOptions = {
  dest?: string | undefined
  tmpPrefix?: string | undefined
  signal?: AbortSignal | undefined
  packumentCache?: Map<string, unknown> | undefined
  preferOffline?: boolean | undefined
}

export type NormalizeOptions = {
  preserve?: string[] | readonly string[] | undefined
}

export type ReadPackageJsonOptions = NormalizeOptions & {
  editable?: boolean | undefined
  normalize?: boolean | undefined
  throws?: boolean | undefined
}

export type ProvenanceOptions = {
  signal?: AbortSignal | undefined
  timeout?: number | undefined
}

export type LicenseNode = {
  license: string
  exception?: string | undefined
  inFile?: string | undefined
  plus?: boolean | undefined
}

export type PacoteOptions = {
  signal?: AbortSignal | undefined
  packumentCache?: Map<string, any> | undefined
  preferOffline?: boolean | undefined
  fullMetadata?: boolean | undefined
}

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ArrayIsArray = Array.isArray
// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectHasOwn = Object.hasOwn

const BINARY_OPERATION_NODE_TYPE = 'BinaryOperation'
const LICENSE_NODE_TYPE = 'License'
const SLSA_PROVENANCE_V0_2 = 'https://slsa.dev/provenance/v0.2'
const SLSA_PROVENANCE_V1_0 = 'https://slsa.dev/provenance/v1'

const escapedScopeRegExp = new RegExp(
  `^[^${escapeRegExp(REGISTRY_SCOPE_DELIMITER[0]!)}]+${escapeRegExp(REGISTRY_SCOPE_DELIMITER)}(?!${escapeRegExp(REGISTRY_SCOPE_DELIMITER[0]!)})`,
)
const fileReferenceRegExp = /^SEE LICEN[CS]E IN (.+)$/
const pkgScopePrefixRegExp = /^@socketregistry\//

const identSymbol = Symbol.for('indent')
const newlineSymbol = Symbol.for('newline')

let _cacache: typeof import('../external/cacache') | undefined
/**
 * Get the cacache module for cache operations.
 */
/*@__NO_SIDE_EFFECTS__*/
function getCacache() {
  if (_cacache === undefined) {
    _cacache = /*@__PURE__*/ require('../external/cacache')
  }
  return _cacache!
}

// Define the interface for the dynamic class
interface EditablePackageJsonConstructor {
  new (): EditablePackageJsonInstance
  fixSteps: unknown[]
  normalizeSteps: unknown[]
  prepareSteps: unknown[]
  create(
    path: string,
    opts?: EditablePackageJsonOptions,
  ): Promise<EditablePackageJsonInstance>
  fix(path: string, opts?: unknown): Promise<EditablePackageJsonInstance>
  load(
    path: string,
    opts?: EditablePackageJsonOptions,
  ): Promise<EditablePackageJsonInstance>
  normalize(
    path: string,
    opts?: NormalizeOptions,
  ): Promise<EditablePackageJsonInstance>
  prepare(path: string, opts?: unknown): Promise<EditablePackageJsonInstance>
}

interface EditablePackageJsonInstance {
  content: Readonly<PackageJson>
  create(path: string): this
  fix(opts?: unknown | undefined): Promise<this>
  fromContent(content: any): this
  fromJSON(json: string): this
  load(path: string, create?: boolean): Promise<this>
  normalize(opts?: NormalizeOptions): Promise<this>
  prepare(opts?: unknown): Promise<this>
  update(content: Partial<PackageJson>): this
  save(options?: SaveOptions | undefined): Promise<boolean>
  saveSync(options?: SaveOptions | undefined): boolean
  willSave(options?: SaveOptions | undefined): boolean
}

let _EditablePackageJsonClass: EditablePackageJsonConstructor | undefined

/**
 * Get the EditablePackageJson class for package.json manipulation.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getEditablePackageJsonClass(): EditablePackageJsonConstructor {
  if (_EditablePackageJsonClass === undefined) {
    const EditablePackageJsonBase =
      /*@__PURE__*/ require('../external/@npmcli/package-json')
    const { parse, read } =
      /*@__PURE__*/ require('../external/@npmcli/package-json/lib/read-package')
    const { packageSort } =
      /*@__PURE__*/ require('../external/@npmcli/package-json/lib/sort')
    _EditablePackageJsonClass =
      class EditablePackageJson extends (EditablePackageJsonBase as EditablePackageJsonConstructor) {
        static override fixSteps = EditablePackageJsonBase.fixSteps
        static override normalizeSteps = EditablePackageJsonBase.normalizeSteps
        static override prepareSteps = EditablePackageJsonBase.prepareSteps

        _canSave = true
        _path: string | undefined = undefined
        _readFileContent = ''
        _readFileJson: unknown = undefined

        override get content(): Readonly<PackageJson> {
          return super.content
        }

        get filename(): string {
          const path = this._path
          if (!path) {
            return ''
          }
          if (path.endsWith('package.json')) {
            return path
          }
          const nodePath = getPath()
          return nodePath.join(path, 'package.json')
        }

        static override async create(
          path: string,
          opts: EditablePackageJsonOptions = {},
        ) {
          const p = new _EditablePackageJsonClass!()
          await p.create(path)
          return opts.data ? p.update(opts.data) : p
        }

        static override async fix(path: string, opts: unknown) {
          const p = new _EditablePackageJsonClass!()
          await p.load(path, true)
          return await p.fix(opts)
        }

        static override async load(
          path: string,
          opts: EditablePackageJsonOptions = {},
        ) {
          const p = new _EditablePackageJsonClass!()
          // Avoid try/catch if we aren't going to create
          if (!opts.create) {
            return await p.load(path)
          }
          try {
            return await p.load(path)
          } catch (err: unknown) {
            if (
              !(err as Error).message.startsWith('Could not read package.json')
            ) {
              throw err
            }
            return p.create(path)
          }
        }

        static override async normalize(path: string, opts: NormalizeOptions) {
          const p = new _EditablePackageJsonClass!()
          await p.load(path)
          return await p.normalize(opts)
        }

        static override async prepare(path: string, opts: unknown) {
          const p = new _EditablePackageJsonClass!()
          await p.load(path, true)
          return await p.prepare(opts)
        }

        override create(path: string) {
          super.create(path)
          ;(this as unknown as { _path: string })._path = path
          return this
        }

        override async fix(opts: unknown = {}) {
          await super.fix(opts)
          return this
        }

        override fromContent(data: unknown) {
          super.fromContent(data)
          ;(this as unknown as { _canSave: boolean })._canSave = false
          return this
        }

        override fromJSON(data: string): this {
          super.fromJSON(data)
          return this
        }

        override async load(path: string, create?: boolean): Promise<this> {
          this._path = path
          const { promises: fsPromises } = getFs()
          let parseErr
          try {
            this._readFileContent = await read(this.filename)
          } catch (err) {
            if (!create) {
              throw err
            }
            parseErr = err
          }
          if (parseErr) {
            const nodePath = getPath()
            const indexFile = nodePath.resolve(this.path || '', 'index.js')
            let indexFileContent
            try {
              indexFileContent = await fsPromises.readFile(indexFile, 'utf8')
            } catch {
              throw parseErr
            }
            try {
              this.fromContent(indexFileContent)
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

        override async normalize(opts: NormalizeOptions = {}): Promise<this> {
          await super.normalize(opts)
          return this
        }

        get path() {
          return this._path
        }

        override async prepare(opts: unknown = {}): Promise<this> {
          await super.prepare(opts)
          return this
        }

        override async save(options?: SaveOptions): Promise<boolean> {
          if (!this._canSave || this.content === undefined) {
            throw new Error('No package.json to save to')
          }
          const { ignoreWhitespace = false, sort = false } = {
            __proto__: null,
            ...options,
          } as SaveOptions
          const {
            [identSymbol]: indent,
            [newlineSymbol]: newline,
            ...rest
          } = this.content as Record<string | symbol, unknown>
          const content = sort ? packageSort(rest) : rest
          const {
            [identSymbol]: _indent,
            [newlineSymbol]: _newline,
            ...origContent
          } = (this._readFileJson || {}) as Record<string | symbol, unknown>

          if (
            ignoreWhitespace &&
            getUtil().isDeepStrictEqual(content, origContent)
          ) {
            return false
          }

          const format =
            indent === undefined || indent === null
              ? '  '
              : (indent as string | number)
          const eol =
            newline === undefined || newline === null
              ? '\n'
              : (newline as string)
          const fileContent = `${JSON.stringify(
            content,
            undefined,
            format,
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

        override saveSync(options?: SaveOptions): boolean {
          if (!this._canSave || this.content === undefined) {
            throw new Error('No package.json to save to')
          }
          const { ignoreWhitespace = false, sort = false } = {
            __proto__: null,
            ...options,
          } as SaveOptions
          const {
            [Symbol.for('indent')]: indent,
            [Symbol.for('newline')]: newline,
            ...rest
          } = this.content as Record<string | symbol, unknown>
          const content = sort ? packageSort(rest) : rest

          if (
            ignoreWhitespace &&
            getUtil().isDeepStrictEqual(content, this._readFileJson)
          ) {
            return false
          }

          const format =
            indent === undefined || indent === null
              ? '  '
              : (indent as string | number)
          const eol =
            newline === undefined || newline === null
              ? '\n'
              : (newline as string)
          const fileContent = `${JSON.stringify(
            content,
            undefined,
            format,
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

        override update(content: PackageJson): this {
          super.update(content)
          return this
        }

        override willSave(options?: SaveOptions): boolean {
          const { ignoreWhitespace = false, sort = false } = {
            __proto__: null,
            ...options,
          } as SaveOptions as SaveOptions
          if (!this._canSave || this.content === undefined) {
            return false
          }
          const {
            [Symbol.for('indent')]: indent,
            [Symbol.for('newline')]: newline,
            ...rest
          } = this.content as Record<string | symbol, unknown>
          const content = sort ? packageSort(rest) : rest

          if (
            ignoreWhitespace &&
            getUtil().isDeepStrictEqual(content, this._readFileJson)
          ) {
            return false
          }

          const format =
            indent === undefined || indent === null
              ? '  '
              : (indent as string | number)
          const eol =
            newline === undefined || newline === null
              ? '\n'
              : (newline as string)
          const fileContent = `${JSON.stringify(
            content,
            undefined,
            format,
          )}\n`.replace(/\n/g, eol)

          if (
            !ignoreWhitespace &&
            fileContent.trim() === this._readFileContent.trim()
          ) {
            return false
          }
          return true
        }
      } as EditablePackageJsonConstructor
  }
  return _EditablePackageJsonClass!
}

// Type for make-fetch-happen fetcher function.
type MakeFetchHappenFetcher = ((
  url: string,
  opts?: any,
) => Promise<Response>) & {
  defaults: (opts: any) => MakeFetchHappenFetcher
  delete: (url: string, opts?: any) => Promise<boolean>
}

let _fetcher: MakeFetchHappenFetcher | undefined
/*@__NO_SIDE_EFFECTS__*/
function getFetcher() {
  if (_fetcher === undefined) {
    const makeFetchHappen =
      /*@__PURE__*/ require('../external/make-fetch-happen')
    _fetcher = makeFetchHappen.defaults({
      cachePath: pacoteCachePath,
      // Prefer-offline: Staleness checks for cached data will be bypassed, but
      // missing data will be requested from the server.
      // https://github.com/npm/make-fetch-happen?tab=readme-ov-file#--optscache
      cache: 'force-cache',
    })
  }
  return _fetcher!
}

let _fs: typeof import('fs') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = /*@__PURE__*/ require('fs')
  }
  return _fs!
}

let _normalizePackageData: typeof import('normalize-package-data') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getNormalizePackageData() {
  if (_normalizePackageData === undefined) {
    _normalizePackageData =
      /*@__PURE__*/ require('../external/normalize-package-data')
  }
  return _normalizePackageData!
}

let _npmPackageArg: typeof import('npm-package-arg') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getNpmPackageArg() {
  if (_npmPackageArg === undefined) {
    _npmPackageArg = /*@__PURE__*/ require('../external/npm-package-arg')
  }
  return _npmPackageArg!
}

let _pack: typeof import('../external/libnpmpack') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getPack() {
  if (_pack === undefined) {
    _pack = /*@__PURE__*/ require('../external/libnpmpack')
  }
  return _pack!
}

let _PackageURL:
  | typeof import('@socketregistry/packageurl-js').PackageURL
  | undefined
/*@__NO_SIDE_EFFECTS__*/
function getPackageURL() {
  if (_PackageURL === undefined) {
    // The 'packageurl-js' package is browser safe.
    const packageUrlJs =
      /*@__PURE__*/ require('../external/@socketregistry/packageurl-js')
    _PackageURL = packageUrlJs.PackageURL
  }
  return _PackageURL!
}

let _pacote: typeof import('pacote') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getPacote() {
  if (_pacote === undefined) {
    _pacote = /*@__PURE__*/ require('../external/pacote')
  }
  return _pacote!
}

let _path: typeof import('path') | undefined
/**
 * Lazily load the path module to avoid Webpack errors.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path!
}

let _semver: typeof import('semver') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getSemver() {
  if (_semver === undefined) {
    // The 'semver' package is browser safe.
    _semver = /*@__PURE__*/ require('../external/semver')
  }
  return _semver!
}

let _spdxCorrect: typeof import('spdx-correct') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getSpdxCorrect() {
  if (_spdxCorrect === undefined) {
    // The 'spdx-correct' package is browser safe.
    _spdxCorrect = /*@__PURE__*/ require('../external/spdx-correct')
  }
  return _spdxCorrect!
}

let _spdxExpParse: typeof import('spdx-expression-parse') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getSpdxExpParse() {
  if (_spdxExpParse === undefined) {
    // The 'spdx-expression-parse' package is browser safe.
    _spdxExpParse = /*@__PURE__*/ require('../external/spdx-expression-parse')
  }
  return _spdxExpParse!
}

let _util: typeof import('util') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getUtil() {
  if (_util === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _util = /*@__PURE__*/ require('util')
  }
  return _util!
}

let _validateNpmPackageName:
  | typeof import('validate-npm-package-name')
  | undefined
/*@__NO_SIDE_EFFECTS__*/
function getValidateNpmPackageName() {
  if (_validateNpmPackageName === undefined) {
    _validateNpmPackageName =
      /*@__PURE__*/ require('../external/validate-npm-package-name')
  }
  return _validateNpmPackageName!
}

/**
 * Collect licenses that are incompatible (copyleft).
 */
/*@__NO_SIDE_EFFECTS__*/
export function collectIncompatibleLicenses(
  licenseNodes: LicenseNode[],
): LicenseNode[] {
  const result = []
  for (let i = 0, { length } = licenseNodes; i < length; i += 1) {
    const node = licenseNodes[i]
    if (node && copyLeftLicenses.has(node.license)) {
      result.push(node)
    }
  }
  return result
}

/**
 * Collect warnings from license nodes.
 */
/*@__NO_SIDE_EFFECTS__*/
export function collectLicenseWarnings(licenseNodes: LicenseNode[]): string[] {
  const warnings = new Map()
  for (let i = 0, { length } = licenseNodes; i < length; i += 1) {
    const node = licenseNodes[i]
    if (!node) {
      continue
    }
    const { license } = node
    if (license === 'UNLICENSED') {
      warnings.set('UNLICENSED', `Package is unlicensed`)
    } else if (node.inFile !== undefined) {
      warnings.set('IN_FILE', `License terms specified in ${node.inFile}`)
    }
  }
  return [...warnings.values()]
}

/**
 * Create an AST node from a raw node.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createAstNode(rawNode: SpdxAstNode): InternalAstNode {
  return ObjectHasOwn(rawNode, 'license')
    ? createLicenseNode(rawNode as SpdxLicenseNode)
    : createBinaryOperationNode(rawNode as SpdxBinaryOperationNode)
}

/**
 * Create a binary operation AST node.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createBinaryOperationNode(
  rawNodeParam: SpdxBinaryOperationNode,
): InternalBinaryOperationNode {
  let left: InternalAstNode | undefined
  let right: InternalAstNode | undefined
  let rawLeft: SpdxAstNode | undefined = rawNodeParam.left
  let rawRight: SpdxAstNode | undefined = rawNodeParam.right
  const { conjunction } = rawNodeParam
  // Clear the reference to help with memory management.
  return {
    __proto__: null,
    type: BINARY_OPERATION_NODE_TYPE as 'BinaryOperation',
    get left() {
      if (left === undefined) {
        left = createAstNode(rawLeft!)
        rawLeft = undefined
      }
      return left
    },
    conjunction,
    get right() {
      if (right === undefined) {
        right = createAstNode(rawRight!)
        rawRight = undefined
      }
      return right
    },
  } as InternalBinaryOperationNode
}

/**
 * Create a license AST node.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createLicenseNode(
  rawNode: SpdxLicenseNode,
): InternalLicenseNode {
  return {
    __proto__: null,
    ...rawNode,
    type: LICENSE_NODE_TYPE as 'License',
  } as InternalLicenseNode
}

/**
 * Create a package.json object for a Socket registry package.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createPackageJson(
  sockRegPkgName: string,
  directory: string,
  options?: PackageJson | undefined,
): PackageJson {
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
    version,
  } = { __proto__: null, ...options } as PackageJson
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
      directory,
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
            objectEntries(engines).map((pair: [PropertyKey, any]) => {
              const strKey = String(pair[0])
              const result: [string, any] = [strKey, pair[1]]
              if (strKey === 'node') {
                const semver = getSemver()
                const { 1: range } = result
                if (
                  !semver.satisfies(
                    // Roughly check Node range as semver.coerce will strip leading
                    // v's, carets (^), comparators (<,<=,>,>=,=), and tildes (~).
                    semver.coerce(range) || '0.0.0',
                    packageDefaultNodeRange,
                  )
                ) {
                  result[1] = packageDefaultNodeRange
                }
              }
              return result
            }),
          ),
        }
      : { engines: { node: packageDefaultNodeRange } }),
    files: ArrayIsArray(files) ? files.slice() : ['*.d.ts', '*.js'],
    ...(isObjectObject(socket)
      ? { socket: { ...socket } }
      : {
          socket: {
            // Valid categories are: cleanup, levelup, speedup, tuneup
            categories: PACKAGE_DEFAULT_SOCKET_CATEGORIES,
          },
        }),
  } as PackageJson
}

/**
 * Extract a package to a destination directory.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function extractPackage(
  pkgNameOrId: string,
  options?: ExtractOptions,
  callback?: (destPath: string) => Promise<any>,
): Promise<void> {
  if (arguments.length === 2 && typeof options === 'function') {
    callback = options
    options = undefined
  }
  const { dest, tmpPrefix, ...extractOptions_ } = {
    __proto__: null,
    ...options,
  } as ExtractOptions
  const extractOptions = {
    packumentCache,
    preferOffline: true,
    ...extractOptions_,
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
      pacoteCachePath,
      { tmpPrefix },
      async (tmpDirPath: string) => {
        await pacote.extract(pkgNameOrId, tmpDirPath, extractOptions)
        if (typeof callback === 'function') {
          await callback(tmpDirPath)
        }
      },
    )
  }
}

/**
 * Fetch the manifest for a package.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function fetchPackageManifest(
  pkgNameOrId: string,
  options?: PacoteOptions,
): Promise<any> {
  const pacoteOptions = {
    __proto__: null,
    signal: abortSignal,
    ...options,
    packumentCache,
    preferOffline: true,
  } as PacoteOptions & { where?: string }
  const { signal } = pacoteOptions
  if (signal?.aborted) {
    return undefined
  }
  const pacote = getPacote()
  let result
  try {
    result = await pacote.manifest(pkgNameOrId, pacoteOptions)
  } catch {}
  if (signal?.aborted) {
    return undefined
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
    ? await fetchPackageManifest(
        `${result.name}@${result.version}`,
        pacoteOptions,
      )
    : null
}

/**
 * Fetch the packument (package document) for a package.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function fetchPackagePackument(
  pkgNameOrId: string,
  options?: PacoteOptions,
): Promise<any> {
  const pacote = getPacote()
  try {
    return await pacote.packument(pkgNameOrId, {
      __proto__: null,
      signal: abortSignal,
      ...options,
      packumentCache,
      preferOffline: true,
    })
  } catch {}
  return undefined
}

/**
 * Extract and filter SLSA provenance attestations from attestation data.
 */
function getAttestations(attestationData: any): any[] {
  if (
    !attestationData.attestations ||
    !ArrayIsArray(attestationData.attestations)
  ) {
    return []
  }

  return attestationData.attestations.filter(
    (attestation: any) =>
      attestation.predicateType === SLSA_PROVENANCE_V0_2 ||
      attestation.predicateType === SLSA_PROVENANCE_V1_0,
  )
}

/**
 * Find the first attestation with valid provenance data.
 */
function findProvenance(attestations: any[]): any {
  for (const attestation of attestations) {
    try {
      let predicate = attestation.predicate

      // If predicate is not directly available, try to decode from DSSE envelope
      if (!predicate && attestation.bundle?.dsseEnvelope?.payload) {
        try {
          const decodedPayload = Buffer.from(
            attestation.bundle.dsseEnvelope.payload,
            'base64',
          ).toString('utf8')
          const statement = JSON.parse(decodedPayload)
          predicate = statement.predicate
        } catch {
          // Failed to decode, continue to next attestation
          continue
        }
      }

      if (predicate?.buildDefinition?.externalParameters) {
        return {
          predicate,
          externalParameters: predicate.buildDefinition.externalParameters,
        }
      }
      // c8 ignore start - Error handling for malformed attestation data should continue processing other attestations.
    } catch {
      // Continue checking other attestations if one fails to parse
    }
    // c8 ignore stop
  }
  return undefined
}

/**
 * Check if a value indicates a trusted publisher (GitHub or GitLab).
 */
function isTrustedPublisher(value: any): boolean {
  if (typeof value !== 'string' || !value) {
    return false
  }

  let url = parseUrl(value)
  let hostname = url?.hostname

  // Handle GitHub workflow refs with @ syntax by trying the first part.
  // Example: "https://github.com/owner/repo/.github/workflows/ci.yml@refs/heads/main"
  if (!url && value.includes('@')) {
    const firstPart = value.split('@')[0]
    if (firstPart) {
      url = parseUrl(firstPart)
    }
    if (url) {
      hostname = url.hostname
    }
  }

  // Try common URL prefixes if not already a complete URL.
  if (!url) {
    const httpsUrl = parseUrl(`https://${value}`)
    if (httpsUrl) {
      hostname = httpsUrl.hostname
    }
  }

  if (hostname) {
    return (
      hostname === 'github.com' ||
      hostname.endsWith('.github.com') ||
      hostname === 'gitlab.com' ||
      hostname.endsWith('.gitlab.com')
    )
  }

  // Fallback: check for provider keywords in non-URL strings.
  return value.includes('github') || value.includes('gitlab')
}

/**
 * Convert raw attestation data to user-friendly provenance details.
 */
export function getProvenanceDetails(attestationData: any): any {
  const attestations = getAttestations(attestationData)
  if (!attestations.length) {
    return undefined
  }
  // Find the first attestation with valid provenance data.
  const provenance = findProvenance(attestations)
  if (!provenance) {
    return { level: 'attested' }
  }

  const { externalParameters, predicate } = provenance
  const def = predicate.buildDefinition

  // Handle both SLSA v0.2 (direct properties) and v1 (nested workflow object)
  const workflow = externalParameters.workflow
  const workflowRef = workflow?.ref || externalParameters.workflow_ref
  const workflowUrl = externalParameters.context
  const workflowPlatform = def?.buildType
  const repository = workflow?.repository || externalParameters.repository
  const gitRef = externalParameters.ref || workflow?.ref
  const commitSha = externalParameters.sha
  const workflowRunId = externalParameters.run_id

  // Check for trusted publishers (GitHub Actions, GitLab CI/CD).
  const trusted =
    isTrustedPublisher(workflowRef) ||
    isTrustedPublisher(workflowUrl) ||
    isTrustedPublisher(workflowPlatform) ||
    isTrustedPublisher(repository)

  return {
    commitSha,
    gitRef,
    level: trusted ? 'trusted' : 'attested',
    repository,
    workflowRef,
    workflowUrl,
    workflowPlatform,
    workflowRunId,
  }
}

/**
 * Fetch package provenance information from npm registry.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function fetchPackageProvenance(
  pkgName: string,
  pkgVersion: string,
  options?: ProvenanceOptions,
): Promise<any> {
  const { signal, timeout = 10_000 } = {
    __proto__: null,
    ...options,
  } as ProvenanceOptions

  if (signal?.aborted) {
    return undefined
  }

  // Create composite signal combining external signal with timeout
  const timeoutSignal = createTimeoutSignal(timeout)
  const compositeSignal = createCompositeAbortSignal(signal, timeoutSignal)
  const fetcher = getFetcher()

  try {
    const response = await fetcher(
      // The npm registry attestations API endpoint.
      `${NPM_REGISTRY_URL}/-/npm/v1/attestations/${encodeURIComponent(pkgName)}@${encodeURIComponent(pkgVersion)}`,
      {
        method: 'GET',
        signal: compositeSignal,
        headers: {
          'User-Agent': 'socket-registry',
        },
      },
    )
    if (response.ok) {
      return getProvenanceDetails(await response.json())
    }
  } catch {}
  return undefined
}

/**
 * Find package extensions for a given package.
 */
/*@__NO_SIDE_EFFECTS__*/
export function findPackageExtensions(pkgName: string, pkgVer: string): any {
  let result
  for (const entry of packageExtensions) {
    const selector = String(entry[0])
    const ext = entry[1]
    const lastAtSignIndex = selector.lastIndexOf('@')
    const name = selector.slice(0, lastAtSignIndex)
    if (pkgName === name) {
      const semver = getSemver()
      const range = selector.slice(lastAtSignIndex + 1)
      if (semver.satisfies(pkgVer, range)) {
        if (result === undefined) {
          result = {}
        }
        if (typeof ext === 'object' && ext !== null) {
          merge(result, ext)
        }
      }
    }
  }
  return result
}

/**
 * Find types for a subpath in package exports.
 */
/*@__NO_SIDE_EFFECTS__*/
export function findTypesForSubpath(entryExports: any, subpath: string): any {
  const queue = [entryExports]
  let pos = 0
  while (pos < queue.length) {
    if (pos === LOOP_SENTINEL) {
      throw new Error(
        'Detected infinite loop in entry exports crawl of getTypesForSubpath',
      )
    }
    const value = queue[pos++]
    if (ArrayIsArray(value)) {
      for (let i = 0, { length } = value; i < length; i += 1) {
        const item = value[i]
        if (item === subpath) {
          return (value as { types?: any }).types
        }
        if (isObject(item)) {
          queue.push(item)
        }
      }
    } else if (isObject(value)) {
      const keys = Object.getOwnPropertyNames(value)
      for (let i = 0, { length } = keys; i < length; i += 1) {
        const item = value[keys[i]!]
        if (item === subpath) {
          return (value as { types?: any }).types
        }
        if (isObject(item)) {
          queue.push(item)
        }
      }
    }
  }
  return undefined
}

/**
 * Get the release tag for a version.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getReleaseTag(spec: string): string {
  if (!spec) {
    return ''
  }
  // Handle scoped packages like @scope/package vs @scope/package@tag.
  let atIndex = -1
  if (spec.startsWith('@')) {
    // Find the second @ for scoped packages.
    atIndex = spec.indexOf('@', 1)
  } else {
    // Find the first @ for unscoped packages.
    atIndex = spec.indexOf('@')
  }
  if (atIndex !== -1) {
    return spec.slice(atIndex + 1)
  }
  return ''
}

/**
 * Extract details from a repository URL.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getRepoUrlDetails(repoUrl: string = ''): {
  user: string
  project: string
} {
  const userAndRepo = repoUrl.replace(/^.+github.com\//, '').split('/')
  const user = userAndRepo[0] || ''
  const project =
    userAndRepo.length > 1 ? userAndRepo[1]!.slice(0, -'.git'.length) : ''
  return { user, project }
}

/**
 * Get subpaths from package exports.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getSubpaths(entryExports: any): string[] {
  if (!isObject(entryExports)) {
    return []
  }
  // Return the keys of the exports object (the subpaths).
  return Object.getOwnPropertyNames(entryExports).filter(key =>
    key.startsWith('.'),
  )
}

/**
 * Get file paths from package exports.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getExportFilePaths(entryExports: any): string[] {
  if (!isObject(entryExports)) {
    return []
  }

  const paths = []

  // Traverse the exports object to find actual file paths.
  for (const key of Object.getOwnPropertyNames(entryExports)) {
    if (!key.startsWith('.')) {
      continue
    }

    const value = entryExports[key]

    if (typeof value === 'string') {
      // Direct path export.
      paths.push(value)
    } else if (isObject(value)) {
      // Conditional or nested export.
      for (const subKey of Object.getOwnPropertyNames(value)) {
        const subValue = value[subKey]
        if (typeof subValue === 'string') {
          paths.push(subValue)
        } else if (Array.isArray(subValue)) {
          // Array of conditions.
          for (const item of subValue) {
            if (typeof item === 'string') {
              paths.push(item)
            } else if (isObject(item)) {
              // Nested conditional.
              for (const nestedKey of Object.getOwnPropertyNames(item)) {
                const nestedValue = item[nestedKey]
                if (typeof nestedValue === 'string') {
                  paths.push(nestedValue)
                }
              }
            }
          }
        }
      }
    }
  }

  // Remove duplicates and filter out non-file paths.
  return [...new Set(paths)].filter(p => p.startsWith('./'))
}

/**
 * Generate GitHub API URL for a tag reference.
 */
/*@__NO_SIDE_EFFECTS__*/
export function gitHubTagRefUrl(
  user: string,
  project: string,
  tag: string,
): string {
  return `https://api.github.com/repos/${user}/${project}/git/ref/tags/${tag}`
}

/**
 * Generate GitHub tarball download URL for a commit SHA.
 */
/*@__NO_SIDE_EFFECTS__*/
export function gitHubTgzUrl(
  user: string,
  project: string,
  sha: string,
): string {
  return `https://github.com/${user}/${project}/archive/${sha}.tar.gz`
}

/**
 * Check if a package name is blessed (allowed to bypass security checks).
 */
/*@__NO_SIDE_EFFECTS__*/
export function isBlessedPackageName(name: any): boolean {
  return (
    typeof name === 'string' &&
    (name === 'sfw' ||
      name === 'socket' ||
      name.startsWith('@socketoverride/') ||
      name.startsWith('@socketregistry/') ||
      name.startsWith('@socketsecurity/'))
  )
}

/**
 * Check if package exports use conditional patterns (e.g., import/require).
 */
/*@__NO_SIDE_EFFECTS__*/
export function isConditionalExports(entryExports: any): boolean {
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
    const key = keys[i]!
    if (key.length > 0 && key.charCodeAt(0) === 46 /*'.'*/) {
      return false
    }
  }
  return true
}

/**
 * Check if a package specifier is a GitHub tarball URL.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isGitHubTgzSpec(spec: any, where?: string): boolean {
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

/**
 * Check if a package specifier is a GitHub URL with committish.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isGitHubUrlSpec(spec: any, where?: string): boolean {
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

/**
 * Check if a fetcher type is for the npm registry.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isRegistryFetcherType(type: string): boolean {
  // RegistryFetcher spec.type check based on:
  // https://github.com/npm/pacote/blob/v19.0.0/lib/fetcher.js#L467-L488
  return (
    type === 'alias' || type === 'range' || type === 'tag' || type === 'version'
  )
}

/**
 * Check if package exports use subpath patterns (keys starting with '.').
 */
/*@__NO_SIDE_EFFECTS__*/
export function isSubpathExports(entryExports: any): boolean {
  if (isObjectObject(entryExports)) {
    const keys = Object.getOwnPropertyNames(entryExports)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      // Subpath entry exports contain keys starting with '.'.
      // Entry exports cannot contain some keys starting with '.' and some not.
      // The exports object MUST either be an object of package subpath keys OR
      // an object of main entry condition name keys only.
      if (keys[i]!.charCodeAt(0) === 46 /*'.'*/) {
        return true
      }
    }
  }
  return false
}

/**
 * Validate a package name against npm naming rules.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isValidPackageName(name: string): boolean {
  const validateNpmPackageName = getValidateNpmPackageName()
  return validateNpmPackageName(name).validForOldPackages
}

/**
 * Convert a package.json object to an editable instance.
 */
/*@__NO_SIDE_EFFECTS__*/
export function pkgJsonToEditable(
  pkgJson: PackageJson,
  options?: EditablePackageJsonOptions,
): any {
  const { normalize, ...normalizeOptions } = {
    __proto__: null,
    ...options,
  } as EditablePackageJsonOptions
  const EditablePackageJson = getEditablePackageJsonClass()
  return new EditablePackageJson().fromContent(
    normalize ? normalizePackageJson(pkgJson, normalizeOptions) : pkgJson,
  )
}

/**
 * Normalize package.json data using npm's normalization rules.
 */
/*@__NO_SIDE_EFFECTS__*/
export function normalizePackageJson(
  pkgJson: PackageJson,
  options?: NormalizeOptions,
): PackageJson {
  const { preserve } = { __proto__: null, ...options } as NormalizeOptions
  // Add default version if not present.
  if (!ObjectHasOwn(pkgJson, 'version')) {
    pkgJson.version = '0.0.0'
  }
  const preserved = [
    ['_id', undefined],
    ['readme', undefined],
    ...(ObjectHasOwn(pkgJson, 'bugs') ? [] : [['bugs', undefined]]),
    ...(ObjectHasOwn(pkgJson, 'homepage') ? [] : [['homepage', undefined]]),
    ...(ObjectHasOwn(pkgJson, 'name') ? [] : [['name', undefined]]),
    ...(ArrayIsArray(preserve)
      ? preserve.map(k => [
          k,
          ObjectHasOwn(pkgJson, k) ? pkgJson[k] : undefined,
        ])
      : []),
  ]
  const normalizePackageData = getNormalizePackageData()
  normalizePackageData(pkgJson)
  if (pkgJson.name && pkgJson.version) {
    merge(pkgJson, findPackageExtensions(pkgJson.name, pkgJson.version))
  }
  // Revert/remove properties we don't care to have normalized.
  // Properties with undefined values are omitted when saved as JSON.
  for (const { 0: key, 1: value } of preserved) {
    pkgJson[key as keyof typeof pkgJson] = value
  }
  return pkgJson
}

/**
 * Pack a package tarball using pacote.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function packPackage(
  spec: string,
  options?: PacoteOptions,
): Promise<any> {
  const pack = getPack()
  return await pack(spec, {
    __proto__: null,
    signal: abortSignal,
    ...options,
    packumentCache,
    preferOffline: true,
  } as PacoteOptions)
}

// Duplicated from spdx-expression-parse - AST node types.
export interface SpdxLicenseNode {
  license: string
  plus?: boolean | undefined
  exception?: string | undefined
}

export interface SpdxBinaryOperationNode {
  left: SpdxLicenseNode | SpdxBinaryOperationNode
  conjunction: 'and' | 'or'
  right: SpdxLicenseNode | SpdxBinaryOperationNode
}

export type SpdxAstNode = SpdxLicenseNode | SpdxBinaryOperationNode

// Internal AST node types with type discriminator.
export interface InternalLicenseNode extends SpdxLicenseNode {
  type: 'License'
}

export interface InternalBinaryOperationNode {
  type: 'BinaryOperation'
  left: InternalLicenseNode | InternalBinaryOperationNode
  conjunction: 'and' | 'or'
  right: InternalLicenseNode | InternalBinaryOperationNode
}

export type InternalAstNode = InternalLicenseNode | InternalBinaryOperationNode

/**
 * Parse an SPDX license expression into an AST.
 */
/*@__NO_SIDE_EFFECTS__*/
export function parseSpdxExp(spdxExp: string): SpdxAstNode | undefined {
  const spdxExpParse = getSpdxExpParse()
  try {
    return spdxExpParse(spdxExp)
  } catch {}
  const spdxCorrect = getSpdxCorrect()
  const corrected = spdxCorrect(spdxExp)
  return corrected ? spdxExpParse(corrected) : undefined
}

/**
 * Read and parse a package.json file asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function readPackageJson(
  filepath: string,
  options?: ReadPackageJsonOptions,
): Promise<PackageJson | undefined> {
  const { editable, normalize, throws, ...normalizeOptions } = {
    __proto__: null,
    ...options,
  } as ReadPackageJsonOptions
  const pkgJson = (await readJson(resolvePackageJsonPath(filepath), {
    throws,
  })) as PackageJson | undefined
  if (pkgJson) {
    return editable
      ? await toEditablePackageJson(pkgJson, {
          path: filepath,
          normalize,
          ...normalizeOptions,
        })
      : normalize
        ? normalizePackageJson(pkgJson, normalizeOptions)
        : pkgJson
  }
  return undefined
}

/**
 * Read and parse package.json from a file path synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export function readPackageJsonSync(
  filepath: string,
  options?: NormalizeOptions & { editable?: boolean; throws?: boolean },
): PackageJson | undefined {
  const { editable, normalize, throws, ...normalizeOptions } = {
    __proto__: null,
    ...options,
  } as NormalizeOptions & {
    editable?: boolean
    throws?: boolean
    normalize?: boolean
  }
  const pkgJson = readJsonSync(resolvePackageJsonPath(filepath), { throws }) as
    | PackageJson
    | undefined
  if (pkgJson) {
    return editable
      ? toEditablePackageJsonSync(pkgJson, {
          path: filepath,
          normalize,
          ...normalizeOptions,
        })
      : normalize
        ? normalizePackageJson(pkgJson, normalizeOptions)
        : pkgJson
  }
  return undefined
}

/**
 * Extract escaped scope from a Socket registry package name.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolveEscapedScope(
  sockRegPkgName: string,
): string | undefined {
  const match = escapedScopeRegExp.exec(sockRegPkgName)?.[0]
  return match || undefined
}

/**
 * Resolve GitHub tarball URL for a package specifier.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function resolveGitHubTgzUrl(
  pkgNameOrId: string,
  where?: any,
): Promise<string> {
  const whereIsPkgJson = isObjectObject(where)
  const pkgJson = whereIsPkgJson
    ? where
    : await readPackageJson(where, { normalize: true })
  if (!pkgJson) {
    return ''
  }
  const { version } = pkgJson
  const npmPackageArg = getNpmPackageArg()
  const parsedSpec = npmPackageArg(
    pkgNameOrId,
    whereIsPkgJson ? undefined : where,
  )
  const isTarballUrl = isGitHubTgzSpec(parsedSpec)
  if (isTarballUrl) {
    return parsedSpec.saveSpec || ''
  }
  const isGitHubUrl = isGitHubUrlSpec(parsedSpec)
  const repository = pkgJson['repository'] as any
  const { project, user } = (isGitHubUrl
    ? parsedSpec.hosted
    : getRepoUrlDetails(repository?.url)) || { project: '', user: '' }

  if (user && project) {
    let apiUrl = ''
    if (isGitHubUrl) {
      apiUrl = gitHubTagRefUrl(user, project, parsedSpec.gitCommittish || '')
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
      const json = (await resp.json()) as { object?: { sha?: string } }
      const sha = json?.object?.sha
      if (sha) {
        return gitHubTgzUrl(user, project, sha)
      }
    }
  }
  return ''
}

/**
 * Convert Socket registry package name back to original npm package name.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolveOriginalPackageName(sockRegPkgName: string): string {
  const name = sockRegPkgName.startsWith(`${SOCKET_REGISTRY_SCOPE}/`)
    ? sockRegPkgName.slice(SOCKET_REGISTRY_SCOPE.length + 1)
    : sockRegPkgName
  const escapedScope = resolveEscapedScope(name)
  return escapedScope
    ? `${unescapeScope(escapedScope)}/${name.slice(escapedScope.length)}`
    : name
}

/**
 * Resolve directory path from a package.json file path.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageJsonDirname(filepath: string): string {
  if (filepath.endsWith('package.json')) {
    const path = getPath()
    return path.dirname(filepath)
  }
  return filepath
}

/**
 * Normalize package.json exports field to canonical format.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageJsonEntryExports(entryExports: any): any {
  // If conditional exports main sugar
  // https://nodejs.org/api/packages.html#exports-sugar
  if (typeof entryExports === 'string' || ArrayIsArray(entryExports)) {
    return { '.': entryExports }
  }
  if (isConditionalExports(entryExports)) {
    return entryExports
  }
  return isObject(entryExports) ? entryExports : undefined
}

/**
 * Resolve full path to package.json from a directory or file path.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageJsonPath(filepath: string): string {
  if (filepath.endsWith('package.json')) {
    return filepath
  }
  const path = getPath()
  return path.join(filepath, 'package.json')
}

/**
 * Parse package license field into structured license nodes.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageLicenses(
  licenseFieldValue: string,
  where: string,
): LicenseNode[] {
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
        inFile: normalizePath(path.relative(where, match[1] || '')),
      },
    ]
  }
  const licenseNodes: InternalLicenseNode[] = []
  const ast = parseSpdxExp(licenseFieldValue)
  if (ast) {
    // SPDX expressions are valid, too except if they contain "LicenseRef" or
    // "DocumentRef". If the licensing terms cannot be described with standardized
    // SPDX identifiers, then the terms should be put in a file in the package
    // and the license field should point users there, e.g. "SEE LICENSE IN LICENSE.txt".
    // https://github.com/kemitchell/validate-npm-package-license.js/blob/v3.0.4/index.js#L18-L24
    visitLicenses(ast, {
      License(node: InternalLicenseNode) {
        const { license } = node
        if (
          license.startsWith('LicenseRef') ||
          license.startsWith('DocumentRef')
        ) {
          licenseNodes.length = 0
          return false
        }
        licenseNodes.push(node)
      },
    })
  }
  return licenseNodes
}

/**
 * Resolve full package name from a PURL object with custom delimiter.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageName(
  purlObj: any,
  delimiter: string = '/',
): string {
  const { name, namespace } = purlObj
  return `${namespace ? `${namespace}${delimiter}` : ''}${name}`
}

/**
 * Convert npm package name to Socket registry format with delimiter.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolveRegistryPackageName(pkgName: string): string {
  const purlObj = getPackageURL().fromString(`pkg:npm/${pkgName}`)
  return purlObj.namespace
    ? `${purlObj.namespace.slice(1)}${REGISTRY_SCOPE_DELIMITER}${purlObj.name}`
    : pkgName
}

/**
 * Convert package.json to editable instance with file persistence.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function toEditablePackageJson(
  pkgJson: PackageJson,
  options?: EditablePackageJsonOptions,
): Promise<any> {
  const { path: filepath, ...pkgJsonToEditableOptions } = {
    __proto__: null,
    ...options,
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
            ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
            ...normalizeOptions,
          })
        : pkgJson,
      null,
      2,
    )}\n`,
  )
}

/**
 * Convert package.json to editable instance with file persistence synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export function toEditablePackageJsonSync(
  pkgJson: PackageJson,
  options?: EditablePackageJsonOptions,
): any {
  const { path: filepath, ...pkgJsonToEditableOptions } = {
    __proto__: null,
    ...options,
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
            ...(isNodeModules(pkgJsonPath) ? {} : { preserve: ['repository'] }),
            ...normalizeOptions,
          })
        : pkgJson,
      null,
      2,
    )}\n`,
  )
}

/**
 * Convert escaped scope name back to npm scope format.
 */
/*@__NO_SIDE_EFFECTS__*/
export function unescapeScope(escapedScope: string): string {
  return `@${escapedScope.slice(0, -REGISTRY_SCOPE_DELIMITER.length)}`
}

export interface LicenseVisitor {
  License?: (
    node: InternalLicenseNode,
    parent?: InternalAstNode,
  ) => boolean | void
  BinaryOperation?: (
    node: InternalBinaryOperationNode,
    parent?: InternalAstNode,
  ) => boolean | void
}

/**
 * Traverse SPDX license AST and invoke visitor callbacks for each node.
 */
/*@__NO_SIDE_EFFECTS__*/
export function visitLicenses(ast: SpdxAstNode, visitor: LicenseVisitor): void {
  const queue: Array<[InternalAstNode, InternalAstNode | undefined]> = [
    [createAstNode(ast), undefined],
  ]
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
    const { 0: node, 1: parent } = queue[pos++]!
    const { type } = node
    if (typeof visitor[type] === 'function' && ObjectHasOwn(visitor, type)) {
      if (type === LICENSE_NODE_TYPE) {
        const licenseVisitor = visitor.License
        if (
          licenseVisitor &&
          licenseVisitor(node as InternalLicenseNode, parent) === false
        ) {
          break
        }
      } else if (type === BINARY_OPERATION_NODE_TYPE) {
        const binaryOpVisitor = visitor.BinaryOperation
        if (
          binaryOpVisitor &&
          binaryOpVisitor(node as InternalBinaryOperationNode, parent) === false
        ) {
          break
        }
      }
    }
    if (type === BINARY_OPERATION_NODE_TYPE) {
      queue[queueLength++] = [node.left, node]
      queue[queueLength++] = [node.right, node]
    }
  }
}
