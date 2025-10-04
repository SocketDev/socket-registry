/**
 * @fileoverview Package registry management with Socket.dev specific utilities.
 * Provides npm package analysis, dependency resolution, and registry operations.
 */

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
  extractPackage,
  findPackageExtensions,
  getReleaseTag,
  packPackage,
  readPackageJson,
  readPackageJsonSync,
  resolveGitHubTgzUrl,
  resolvePackageName,
  resolveRegistryPackageName,
} from './packages/operations'
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
  extractPackage,
  fetchPackageManifest,
  fetchPackagePackument,
  fetchPackageProvenance,
  findPackageExtensions,
  findTypesForSubpath,
  getExportFilePaths,
  getProvenanceDetails,
  getReleaseTag,
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
  packPackage,
  parseSpdxExp,
  readPackageJson,
  readPackageJsonSync,
  resolveEscapedScope,
  resolveGitHubTgzUrl,
  resolveOriginalPackageName,
  resolvePackageName,
  resolvePackageJsonDirname,
  resolvePackageJsonPath,
  resolvePackageJsonEntryExports,
  resolvePackageLicenses,
  resolveRegistryPackageName,
  unescapeScope,
  visitLicenses,
}
