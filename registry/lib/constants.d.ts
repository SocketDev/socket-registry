import { IFastSort } from 'fast-sort'

declare const kInternalsSymbol: unique symbol

interface ENV {
  readonly CI: boolean
  readonly NODE_AUTH_TOKEN: string
  readonly PRE_COMMIT: boolean
}
interface Internals {
  readonly createLazyGetter: <T>(getter: () => T) => () => T
  readonly defineLazyGetter: <T>(
    object: object,
    propKey: PropertyKey,
    getter: () => T
  ) => object
  readonly defineLazyGetters: <T extends object>(
    object: object,
    getterObj: T
  ) => object
  readonly getGlobMatcher: (
    glob: string | string[],
    options?: object
  ) => (path: string) => boolean
  readonly innerReadDirNames: (
    dirents: Array<{
      isDirectory(): boolean
      parentPath: string
      name: string
    }>,
    options?: {
      includeEmpty?: boolean
      sort?: boolean
    }
  ) => string[]
  readonly isDirEmptySync: (dirname: string) => boolean
  readonly localeCompare: Intl.Collator['compare']
  readonly naturalSort: <T>(arrayToSort: T[]) => IFastSort<T>
  readonly readDirNamesSync: (
    dirname: string,
    options?: {
      includeEmpty?: boolean
      sort?: boolean
    }
  ) => string[]
}
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
declare const constantsModule: {
  readonly [kInternalsSymbol]: Internals
  readonly COLUMN_LIMIT: 80
  readonly EMPTY_FILE: '/* empty */\n'
  readonly ENV: ENV
  readonly ESLINT_CONFIG_JS: 'eslint.config.js'
  readonly ESNEXT: 'esnext'
  readonly GIT_IGNORE: '.gitignore'
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
  readonly NODE_MODULES: 'node_modules'
  readonly NODE_MODULES_GLOB_RECURSIVE: '**/node_modules'
  readonly NODE_WORKSPACES: 'node_workspaces'
  readonly NODE_VERSION: string
  readonly NPM_ORG: 'socketregistry'
  readonly OVERRIDES: 'overrides'
  readonly PACKAGE_DEFAULT_SOCKET_CATEGORIES: readonly ['cleanup']
  readonly PACKAGE_DEFAULT_NODE_RANGE: string
  readonly PACKAGE_DEFAULT_VERSION: '1.0.0'
  readonly PACKAGE_JSON: 'package.json'
  readonly PACKAGE_LOCK: 'package-lock.json'
  readonly PACKAGE_SCOPE: '@socketregistry'
  readonly PRETTIER_IGNORE: '.prettierignore'
  readonly PRETTIER_RC: '.prettierrc'
  readonly README_GLOB: 'README{.*,}'
  readonly README_GLOB_RECURSIVE: '**/README{.*,}'
  readonly README_MD: 'README.md'
  readonly REGISTRY_SCOPE_DELIMITER: '__'
  readonly REGISTRY_WORKSPACE: 'registry'
  readonly REPO_ORG: 'SocketDev'
  readonly REPO_NAME: 'socket-registry'
  readonly TEMPLATE_CJS: 'cjs'
  readonly TEMPLATE_CJS_BROWSER: 'cjs-browser'
  readonly TEMPLATE_CJS_ESM: 'cjs-esm'
  readonly TEMPLATE_ES_SHIM_CONSTRUCTOR: 'es-shim-constructor'
  readonly TEMPLATE_ES_SHIM_PROTOTYPE_METHOD: 'es-shim-prototype-method'
  readonly TEMPLATE_ES_SHIM_STATIC_METHOD: 'es-shim-static-method'
  readonly TSCONFIG_JSON: 'tsconfig.json'
  readonly UNLICENCED: 'UNLICENCED'
  readonly UNLICENSED: 'UNLICENSED'
  readonly WIN_32: boolean
  readonly copyLeftLicenses: ReadonlySet<string>
  readonly execPath: string
  readonly ignoreGlobs: ReadonlyArray<string>
  readonly kInternalsSymbol: typeof kInternalsSymbol
  readonly lifecycleScriptNames: ReadonlySet<string>
  readonly maintainedNodeVersions: MaintainedNodeVersions
  readonly npmExecPath: string
  readonly packageExtensions: ReadonlyArray<[string, object]>
  readonly packumentCache: Map<unknown, unknown>
  readonly pacoteCachePath: string
  readonly parseArgsConfig: ParseArgsConfig
  readonly skipTestsByEcosystem: Readonly<Record<string, ReadonlySet<string>>>
  readonly tsLibsAvailable: ReadonlySet<string>
  readonly tsTypesAvailable: ReadonlySet<string>
  readonly win32EnsureTestsByEcosystem: Readonly<
    Record<string, ReadonlySet<string>>
  >
}
export = constantsModule
