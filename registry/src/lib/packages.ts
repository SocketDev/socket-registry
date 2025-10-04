/**
 * @fileoverview Package registry management with Socket.dev specific utilities.
 * Provides npm package analysis, dependency resolution, and registry operations.
 */

import REGISTRY_SCOPE_DELIMITER from './constants/REGISTRY_SCOPE_DELIMITER'
import abortSignal from './constants/abort-signal'
import packageExtensions from './constants/package-extensions'
import packumentCache from './constants/packument-cache'
import pacoteCachePath from './constants/pacote-cache-path'
import { readJson, readJsonSync } from './fs'
import { isObjectObject, merge } from './objects'
import {
  findTypesForSubpath,
  getExportFilePaths,
  getSubpaths,
  isConditionalExports,
  isSubpathExports,
  resolvePackageJsonEntryExports,
} from './packages/exports'
import {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  createAstNode,
  createBinaryOperationNode,
  createLicenseNode,
  parseSpdxExp,
  resolvePackageLicenses,
  visitLicenses,
} from './packages/licenses'
import {
  createPackageJson,
  fetchPackageManifest,
  fetchPackagePackument,
} from './packages/manifest'
import {
  normalizePackageJson,
  resolveEscapedScope,
  resolveOriginalPackageName,
  unescapeScope,
} from './packages/normalize'
import {
  resolvePackageJsonDirname,
  resolvePackageJsonPath,
} from './packages/paths'
import {
  fetchPackageProvenance,
  getProvenanceDetails,
} from './packages/provenance'
import {
  getRepoUrlDetails,
  gitHubTagRefUrl,
  gitHubTgzUrl,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
} from './packages/specs'
import {
  isBlessedPackageName,
  isRegistryFetcherType,
  isValidPackageName,
} from './packages/validation'
import { isNodeModules } from './path'

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

export type {
  InternalAstNode,
  InternalBinaryOperationNode,
  InternalLicenseNode,
  LicenseVisitor,
  SpdxAstNode,
  SpdxBinaryOperationNode,
  SpdxLicenseNode,
} from './packages/licenses'

export {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  createAstNode,
  createBinaryOperationNode,
  createLicenseNode,
  createPackageJson,
  fetchPackageManifest,
  fetchPackagePackument,
  fetchPackageProvenance,
  findTypesForSubpath,
  getProvenanceDetails,
  getExportFilePaths,
  getRepoUrlDetails,
  getSubpaths,
  gitHubTagRefUrl,
  gitHubTgzUrl,
  isBlessedPackageName,
  isConditionalExports,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
  isRegistryFetcherType,
  isSubpathExports,
  isValidPackageName,
  normalizePackageJson,
  parseSpdxExp,
  resolveEscapedScope,
  resolveOriginalPackageName,
  resolvePackageJsonDirname,
  resolvePackageJsonPath,
  resolvePackageJsonEntryExports,
  resolvePackageLicenses,
  unescapeScope,
  visitLicenses,
}
