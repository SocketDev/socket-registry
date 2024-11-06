import type { IFastSort } from 'fast-sort'
import type { FlatConfig } from '@eslint/compat'

declare const kInternalsSymbol: unique symbol

interface ENV {
  readonly CI: boolean
  readonly NODE_AUTH_TOKEN: string
  readonly PRE_COMMIT: boolean
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
  readonly localeCompare: (a: string, b: string) => number
  readonly naturalSort: <T>(arrayToSort: T[]) => IFastSort<T>
  readonly readDirNamesSync: (
    dirname: string,
    options?: {
      includeEmpty?: boolean
      sort?: boolean
    }
  ) => string[]
  readonly which: (cmd: string, options?: object) => Promise<string>
  readonly whichSync: (cmd: string, options?: object) => string
}

declare const constantsModule: {
  readonly [kInternalsSymbol]: Internals
  readonly COLUMN_LIMIT: 80
  readonly EMPTY_FILE: '/* empty */\n'
  readonly ENV: ENV
  readonly ESLINT_CONFIG_JS: 'eslint.config.js'
  readonly ESNEXT: 'esnext'
  readonly LICENSE: 'LICENSE'
  readonly LICENSE_CONTENT: string
  readonly LICENSE_GLOB: 'LICEN[CS]E{[.-]*,}'
  readonly LICENSE_GLOB_RECURSIVE: string
  readonly LICENSE_ORIGINAL: string
  readonly LICENSE_ORIGINAL_GLOB: '*.original{.*,}'
  readonly LICENSE_ORIGINAL_GLOB_RECURSIVE: string
  readonly LOOP_SENTINEL: 1000000
  readonly MIT: 'MIT'
  readonly NODE_MODULES: 'node_modules'
  readonly NODE_MODULES_GLOB_RECURSIVE: string
  readonly NODE_WORKSPACES: 'node_workspaces'
  readonly NODE_VERSION: string
  readonly NPM_ORG: 'socketregistry'
  readonly OVERRIDES: 'overrides'
  readonly PACKAGE_CURRENT_VERSION: string
  readonly PACKAGE_DEFAULT_SOCKET_CATEGORIES: readonly ['cleanup']
  readonly PACKAGE_DEFAULT_NODE_RANGE: string
  readonly PACKAGE_DEFAULT_VERSION: '1.0.0'
  readonly PACKAGE_JSON: 'package.json'
  readonly PACKAGE_LOCK: 'package-lock.json'
  readonly PACKAGE_SCOPE: string
  readonly README_GLOB: 'README{.*,}'
  readonly README_GLOB_RECURSIVE: string
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
  readonly ecosystems: readonly string[]
  readonly execPath: string
  readonly gitExecPath: string
  readonly gitIgnoreFile: FlatConfig
  readonly ignoreGlobs: readonly string[]
  readonly lifecycleScriptNames: ReadonlySet<string>
  readonly maintainedNodeVersions: MaintainedNodeVersions
  readonly npmExecPath: string
  readonly npmPackageNames: readonly string[]
  readonly npmPackagesPath: string
  readonly npmTemplatesPath: string
  readonly npmTemplatesReadmePath: string
  readonly packageExtensions: ReadonlyArray<[string, object]>
  readonly packumentCache: Map<unknown, unknown>
  readonly pacoteCachePath: string
  readonly parseArgsConfig: ParseArgsConfig
  readonly perfNpmPath: string
  readonly perfNpmFixturesPath: string
  readonly prettierConfigPromise: Promise<object | null>
  readonly prettierIgnoreFile: FlatConfig
  readonly manifestJsonPath: string
  readonly registryPkgPath: string
  readonly relManifestJsonPath: string
  readonly relNpmPackagesPath: string
  readonly relPackagesPath: string
  readonly relTestNpmPath: string
  readonly relTestNpmNodeModulesPath: string
  readonly rootEslintConfigPath: string
  readonly rootLicensePath: string
  readonly rootNodeModulesPath: string
  readonly rootPackageJsonPath: string
  readonly rootPackageLockPath: string
  readonly rootPackagesPath: string
  readonly rootPath: string
  readonly rootTsConfigPath: string
  readonly skipTestsByEcosystem: Readonly<Record<string, ReadonlySet<string>>>
  readonly tapCiConfigPath: string
  readonly tapConfigPath: string
  readonly tapRunExecPath: string
  readonly templatesPath: string
  readonly testNpmPath: string
  readonly testNpmFixturesPath: string
  readonly testNpmNodeModulesPath: string
  readonly testNpmNodeWorkspacesPath: string
  readonly testNpmPkgJsonPath: string
  readonly testNpmPkgLockPath: string
  readonly tsLibsAvailable: ReadonlySet<string>
  readonly tsTypesAvailable: ReadonlySet<string>
  readonly tsxExecPath: string
  readonly win32EnsureTestsByEcosystem: Readonly<
    Record<string, ReadonlySet<string>>
  >
  readonly yarnPkgExtsPath: string
  readonly yarnPkgExtsJsonPath: string
}
export = constantsModule
