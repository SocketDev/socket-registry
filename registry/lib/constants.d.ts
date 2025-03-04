/// <reference types="node" />
import { Serializable } from 'node:child_process'
import { IFastSort } from 'fast-sort'
import { Spinner } from './spinner'

declare const kInternalsSymbol: unique symbol
declare function objectEntries<T>(
  obj: { [key: string | symbol]: T } | ArrayLike<T> | null | undefined
): [string | symbol, T][]
declare function objectEntries(obj: {}): [string | symbol, any][]
declare function objectFromEntries<T = any>(
  entries: Iterable<readonly [string | symbol, T]>
): { [k: string | symbol]: T }
declare function objectFromEntries(entries: Iterable<readonly any[]>): any
declare type ConstantsObjectOptions = {
  getters?: GetterDefObj | undefined
  internals?: object | undefined
  mixin?: object | undefined
}
interface ENV {
  readonly CI: boolean
  readonly NODE_AUTH_TOKEN: string
  readonly NODE_ENV: string
  readonly PRE_COMMIT: boolean
  readonly TAP: boolean
  readonly VITEST: boolean
}
declare type GetterDefObj = { [key: PropertyKey]: () => any }
declare type IPC = Readonly<{ [key: string]: Serializable }>
interface Internals {
  readonly createConstantsObject: (
    props: object,
    options?: ConstantsObjectOptions | undefined
  ) => Readonly<object>
  readonly createLazyGetter: <T>(
    name: PropertyKey,
    getter: () => T,
    stats?: LazyGetterStats | undefined
  ) => () => T
  readonly defineGetter: <T>(
    object: object,
    propKey: PropertyKey,
    getter: () => T
  ) => object
  readonly defineLazyGetter: <T>(
    object: object,
    propKey: PropertyKey,
    getter: () => T,
    stats?: LazyGetterStats | undefined
  ) => object
  readonly defineLazyGetters: (
    object: object,
    getterDefObj: GetterDefObj | undefined,
    stats?: LazyGetterStats | undefined
  ) => object
  readonly getGlobMatcher: (
    glob: string | string[] | Readonly<string[]>,
    options?: object | undefined
  ) => (path: string) => boolean
  readonly getIPC: {
    (): Promise<IPC>
    <K extends keyof IPC | undefined>(
      key?: K | undefined
    ): Promise<K extends keyof IPC ? IPC[K] : IPC>
  }
  readonly innerReadDirNames: (
    dirents: Array<{
      isDirectory(): boolean
      parentPath: string
      name: string
    }>,
    options?: {
      includeEmpty?: boolean | undefined
      sort?: boolean | undefined
    }
  ) => string[]
  readonly isDirEmptySync: (dirname: string) => boolean
  get lazyGetterStats(): { initialized: Set<PropertyKey> }
  readonly localeCompare: Intl.Collator['compare']
  readonly naturalCompare: Intl.Collator['compare']
  readonly naturalSorter: <T>(arrayToSort: T[]) => IFastSort<T>
  readonly objectEntries: typeof objectEntries
  readonly objectFromEntries: typeof objectFromEntries
  readonly readDirNamesSync: (
    dirname: string,
    options?: {
      includeEmpty?: boolean | undefined
      sort?: boolean | undefined
    }
  ) => string[]
}
declare type LazyGetterStats = { initialized?: Set<PropertyKey> | undefined }
interface MaintainedNodeVersions extends Array<string> {
  readonly previous: string
  readonly current: string
  readonly next: string
}
interface ParseArgsConfig {
  readonly options: {
    readonly force: {
      readonly type: 'boolean'
      readonly short: 'f'
    }
    readonly quiet: {
      readonly type: 'boolean'
    }
  }
  readonly strict: false
}
declare const Constants: {
  readonly [kInternalsSymbol]: Internals
  readonly 'Symbol(kInternalsSymbol)': Internals
  readonly AT_LATEST: '@latest'
  readonly BIOME_JSON: 'biome.json'
  readonly CI: 'CI'
  readonly COLUMN_LIMIT: 80
  readonly EMPTY_FILE: '/* empty */\n'
  readonly ENV: ENV
  readonly ESLINT_CONFIG_JS: 'eslint.config.js'
  readonly ESNEXT: 'esnext'
  readonly EXTENSIONS: 'extensions'
  readonly EXTENSIONS_JSON: 'extensions.json'
  readonly GIT_IGNORE: '.gitignore'
  readonly IPC: IPC
  readonly LATEST: 'latest'
  readonly LICENSE: 'LICENSE'
  readonly LICENSE_GLOB: 'LICEN[CS]E{[.-]*,}'
  readonly LICENSE_GLOB_RECURSIVE: `**/LICEN[CS]E{[.-]*,}`
  readonly LICENSE_ORIGINAL: 'LICENSE.original'
  readonly LICENSE_ORIGINAL_GLOB: '*.original{.*,}'
  readonly LICENSE_ORIGINAL_GLOB_RECURSIVE: `**/*.original{.*,}`
  readonly LOOP_SENTINEL: 1_000_000
  readonly MANIFEST_JSON: 'manifest.json'
  readonly MIT: 'MIT'
  readonly NODE_AUTH_TOKEN: 'NODE_AUTH_TOKEN'
  readonly NODE_ENV: 'NODE_ENV'
  readonly NODE_MODULES: 'node_modules'
  readonly NODE_MODULES_GLOB_RECURSIVE: '**/node_modules'
  readonly NODE_WORKSPACES: 'node_workspaces'
  readonly NODE_VERSION: string
  readonly NPM: 'npm'
  readonly NPX: 'npx'
  readonly OVERRIDES: 'overrides'
  readonly PACKAGE_DEFAULT_SOCKET_CATEGORIES: readonly ['cleanup']
  readonly PACKAGE_DEFAULT_NODE_RANGE: string
  readonly PACKAGE_DEFAULT_VERSION: '1.0.0'
  readonly PACKAGE_JSON: 'package.json'
  readonly PACKAGE_LOCK: 'package-lock.json'
  readonly PRE_COMMIT: 'PRE_COMMIT'
  readonly README_GLOB: 'README{.*,}'
  readonly README_GLOB_RECURSIVE: '**/README{.*,}'
  readonly README_MD: 'README.md'
  readonly REGISTRY: 'registry'
  readonly REGISTRY_SCOPE_DELIMITER: '__'
  readonly RESOLUTIONS: 'resolutions'
  readonly SOCKET_GITHUB_ORG: 'SocketDev'
  readonly SOCKET_IPC_HANDSHAKE: 'SOCKET_IPC_HANDSHAKE'
  readonly SOCKET_OVERRIDE_SCOPE: '@socketoverride'
  readonly SOCKET_PUBLIC_API_KEY: string
  readonly SOCKET_PUBLIC_API_TOKEN: string
  readonly SOCKET_REGISTRY_NPM_ORG: 'socketregistry'
  readonly SOCKET_REGISTRY_PACKAGE_NAME: '@socketsecurity/registry'
  readonly SOCKET_REGISTRY_REPO_NAME: 'socket-registry'
  readonly SOCKET_REGISTRY_SCOPE: '@socketregistry'
  readonly SOCKET_SECURITY_SCOPE: '@socketsecurity'
  readonly SUPPORTS_NODE_DISABLE_WARNING_FLAG: boolean
  readonly SUPPORTS_NODE_REQUIRE_MODULE: boolean
  readonly SUPPORTS_NODE_RUN: boolean
  readonly SUPPORTS_PROCESS_SEND: boolean
  readonly TAP: 'TAP'
  readonly TEMPLATE_CJS: 'cjs'
  readonly TEMPLATE_CJS_BROWSER: 'cjs-browser'
  readonly TEMPLATE_CJS_ESM: 'cjs-esm'
  readonly TEMPLATE_ES_SHIM_CONSTRUCTOR: 'es-shim-constructor'
  readonly TEMPLATE_ES_SHIM_PROTOTYPE_METHOD: 'es-shim-prototype-method'
  readonly TEMPLATE_ES_SHIM_STATIC_METHOD: 'es-shim-static-method'
  readonly TSCONFIG_JSON: 'tsconfig.json'
  readonly UNDEFINED_TOKEN: {}
  readonly UNLICENCED: 'UNLICENCED'
  readonly UNLICENSED: 'UNLICENSED'
  readonly VITEST: 'VITEST'
  readonly WIN32: boolean
  readonly abortController: AbortController
  readonly abortSignal: AbortSignal
  readonly copyLeftLicenses: ReadonlySet<string>
  readonly execPath: string
  readonly ignoreGlobs: Readonly<
    [
      '**/.git',
      '**/.npmrc',
      '**/bun.lockb?',
      '**/node_modules',
      '**/package-lock.json',
      '**/pnpm-lock.ya?ml',
      '**/yarn.lock',
      '**/.DS_Store',
      '**/.gitignore',
      '**/.hg',
      '**/.lock-wscript',
      '**/.npmignore',
      '**/.svn',
      '**/.wafpickle-*',
      '**/.*.swp',
      '**/._*/**',
      '**/archived-packages/**',
      '**/build/config.gypi',
      '**/CVS',
      '**/npm-debug.log',
      '**/*.orig',
      '**/.env',
      '**/.eslintcache',
      '**/.nvm',
      '**/.tap',
      '**/.tapci.yaml',
      '**/.vscode',
      '**/*.tsbuildinfo',
      '**/Thumbs.db'
    ]
  >
  readonly kInternalsSymbol: typeof kInternalsSymbol
  readonly lifecycleScriptNames: ReadonlySet<string>
  readonly maintainedNodeVersions: MaintainedNodeVersions
  readonly nodeNoWarningsFlags: ReadonlyArray<string>
  readonly npmExecPath: string
  readonly packageExtensions: ReadonlyArray<[string, object]>
  readonly packumentCache: Map<unknown, unknown>
  readonly pacoteCachePath: string
  readonly parseArgsConfig: ParseArgsConfig
  readonly skipTestsByEcosystem: Readonly<Record<string, ReadonlySet<string>>>
  readonly spinner: Spinner
  readonly tsLibsAvailable: ReadonlySet<string>
  readonly tsTypesAvailable: ReadonlySet<string>
  readonly win32EnsureTestsByEcosystem: Readonly<
    Record<string, ReadonlySet<string>>
  >
}
declare namespace Constants {
  export {
    ConstantsObjectOptions,
    ENV,
    GetterDefObj,
    Internals,
    IPC,
    LazyGetterStats,
    MaintainedNodeVersions,
    ParseArgsConfig
  }
}
export = Constants
