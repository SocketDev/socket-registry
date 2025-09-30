/** @fileoverview Main entry point for socket-registry package. */

// Type definitions
enum Categories {
  CLEANUP = 'cleanup',
  LEVELUP = 'levelup',
  SPEEDUP = 'speedup',
  TUNEUP = 'tuneup',
}

type CategoryString = `${Categories}`

enum Interop {
  BROWSERIFY = 'browserify',
  CJS = 'cjs',
  ESM = 'esm',
}

type InteropString = `${Interop}`

// Based on SocketPURL_Type from socket-sdk-js
enum PURL_Type {
  APK = 'apk',
  BITBUCKET = 'bitbucket',
  COCOAPODS = 'cocoapods',
  CARGO = 'cargo',
  CHROME = 'chrome',
  COMPOSER = 'composer',
  CONAN = 'conan',
  CONDA = 'conda',
  CRAN = 'cran',
  DEB = 'deb',
  DOCKER = 'docker',
  GEM = 'gem',
  GENERIC = 'generic',
  GITHUB = 'github',
  GOLANG = 'golang',
  HACKAGE = 'hackage',
  HEX = 'hex',
  HUGGINGFACE = 'huggingface',
  MAVEN = 'maven',
  MLFLOW = 'mlflow',
  NPM = 'npm',
  NUGET = 'nuget',
  QPKG = 'qpkg',
  OCI = 'oci',
  PUB = 'pub',
  PYPI = 'pypi',
  RPM = 'rpm',
  SWID = 'swid',
  SWIFT = 'swift',
  UNKNOWN = 'unknown',
}

type EcosystemString = `${PURL_Type}`

type ManifestEntryData = {
  categories: CategoryString[]
  interop: InteropString[]
  license: string
  name: string
  package: string
  version: string
  deprecated?: boolean | undefined
  engines: {
    node: string
    npm?: string | undefined
  }
  skipTests?: boolean | undefined
}

type ManifestEntry = [string, ManifestEntryData]

type Manifest = {
  [Ecosystem in PURL_Type]: ManifestEntry[]
}

// Main functionality
let _PackageURL:
  | typeof import('@socketregistry/packageurl-js').PackageURL
  | undefined

/*@__NO_SIDE_EFFECTS__*/
function getPackageURL() {
  if (_PackageURL === undefined) {
    // The 'packageurl-js' package is browser safe.
    const packageUrlJs = /*@__PURE__*/ require('./external/@socketregistry/packageurl-js')
    _PackageURL = packageUrlJs.PackageURL
  }
  return _PackageURL!
}

/*@__NO_SIDE_EFFECTS__*/
function getManifestData(): Manifest
function getManifestData(eco: EcosystemString): ManifestEntry[]
function getManifestData(
  eco: EcosystemString,
  sockRegPkgName: string,
): ManifestEntryData | undefined
function getManifestData(
  eco?: EcosystemString | undefined,
  sockRegPkgName?: string | undefined,
): Manifest | ManifestEntry[] | ManifestEntryData | undefined {
  const registryManifest = /*@__PURE__*/ require('../manifest.json') as Manifest
  if (eco) {
    const entries = registryManifest[eco]
    return sockRegPkgName
      ? entries?.find(
          ({ 0: purlStr }) =>
            getPackageURL().fromString(purlStr).name === sockRegPkgName,
        )?.[1]
      : entries
  }
  return registryManifest
}

// Import constants for re-export
import constants from './lib/constants'

// Export types and functions
export { Categories, Interop, PURL_Type, getManifestData }

// Export ALL_CAPS constants
// Constants object is dynamically created with getters, cast to any for destructuring
export const {
  AT_LATEST,
  BUN,
  BUN_LOCK,
  BUN_LOCKB,
  CHANGELOG_MD,
  CI,
  COLUMN_LIMIT,
  DARWIN,
  DOT_GIT_DIR,
  DOT_PACKAGE_LOCK_JSON,
  DOT_SOCKET_DIR,
  EMPTY_FILE,
  EMPTY_VALUE,
  ENV,
  ESLINT_CONFIG_JS,
  ESNEXT,
  EXTENSIONS,
  EXTENSIONS_JSON,
  EXT_CJS,
  EXT_CMD,
  EXT_CTS,
  EXT_DTS,
  EXT_JS,
  EXT_JSON,
  EXT_LOCK,
  EXT_LOCKB,
  EXT_MD,
  EXT_MJS,
  EXT_MTS,
  EXT_PS1,
  EXT_YAML,
  EXT_YML,
  GITIGNORE,
  LATEST,
  LICENSE,
  LICENSE_GLOB,
  LICENSE_GLOB_RECURSIVE,
  LICENSE_ORIGINAL,
  LICENSE_ORIGINAL_GLOB,
  LICENSE_ORIGINAL_GLOB_RECURSIVE,
  LOOP_SENTINEL,
  MANIFEST_JSON,
  MIT,
  NODE_AUTH_TOKEN,
  NODE_ENV,
  NODE_MODULES,
  NODE_MODULES_GLOB_RECURSIVE,
  NODE_SEA_FUSE,
  NODE_VERSION,
  NPM,
  NPM_SHRINKWRAP_JSON,
  NPX,
  OVERRIDES,
  PACKAGE_DEFAULT_NODE_RANGE,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES,
  PACKAGE_DEFAULT_VERSION,
  PACKAGE_JSON,
  PACKAGE_LOCK_JSON,
  PNPM,
  PNPM_LOCK_YAML,
  PRE_COMMIT,
  README_GLOB,
  README_GLOB_RECURSIVE,
  README_MD,
  REGISTRY,
  REGISTRY_SCOPE_DELIMITER,
  RESOLUTIONS,
  SOCKET_GITHUB_ORG,
  SOCKET_IPC_HANDSHAKE,
  SOCKET_OVERRIDE_SCOPE,
  SOCKET_PUBLIC_API_TOKEN,
  SOCKET_REGISTRY_NPM_ORG,
  SOCKET_REGISTRY_PACKAGE_NAME,
  SOCKET_REGISTRY_REPO_NAME,
  SOCKET_REGISTRY_SCOPE,
  SOCKET_SECURITY_SCOPE,
  SUPPORTS_NODE_COMPILE_CACHE_API,
  SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR,
  SUPPORTS_NODE_DISABLE_WARNING_FLAG,
  SUPPORTS_NODE_PERMISSION_FLAG,
  SUPPORTS_NODE_REQUIRE_MODULE,
  SUPPORTS_NODE_RUN,
  SUPPORTS_PROCESS_SEND,
  TSCONFIG_JSON,
  UNDEFINED_TOKEN,
  UNKNOWN_ERROR,
  UNKNOWN_VALUE,
  UNLICENCED,
  UNLICENSED,
  UTF8,
  VITEST,
  VLT,
  VLT_LOCK_JSON,
  WIN32,
  YARN,
  YARN_BERRY,
  YARN_CLASSIC,
  YARN_LOCK,
} = constants as any

export type {
  CategoryString,
  EcosystemString,
  InteropString,
  Manifest,
  ManifestEntry,
  ManifestEntryData,
}

// Default export for CommonJS compatibility
const SocketSecurityRegistry = {
  AT_LATEST,
  BUN,
  BUN_LOCK,
  BUN_LOCKB,
  Categories,
  CHANGELOG_MD,
  CI,
  COLUMN_LIMIT,
  DARWIN,
  DOT_GIT_DIR,
  DOT_PACKAGE_LOCK_JSON,
  DOT_SOCKET_DIR,
  EMPTY_FILE,
  EMPTY_VALUE,
  ENV,
  ESLINT_CONFIG_JS,
  ESNEXT,
  EXTENSIONS,
  EXTENSIONS_JSON,
  EXT_CJS,
  EXT_CMD,
  EXT_CTS,
  EXT_DTS,
  EXT_JS,
  EXT_JSON,
  EXT_LOCK,
  EXT_LOCKB,
  EXT_MD,
  EXT_MJS,
  EXT_MTS,
  EXT_PS1,
  EXT_YAML,
  EXT_YML,
  GITIGNORE,
  Interop,
  LATEST,
  LICENSE,
  LICENSE_GLOB,
  LICENSE_GLOB_RECURSIVE,
  LICENSE_ORIGINAL,
  LICENSE_ORIGINAL_GLOB,
  LICENSE_ORIGINAL_GLOB_RECURSIVE,
  LOOP_SENTINEL,
  MANIFEST_JSON,
  MIT,
  NODE_AUTH_TOKEN,
  NODE_ENV,
  NODE_MODULES,
  NODE_MODULES_GLOB_RECURSIVE,
  NODE_SEA_FUSE,
  NODE_VERSION,
  NPM,
  NPM_SHRINKWRAP_JSON,
  NPX,
  OVERRIDES,
  PACKAGE_DEFAULT_NODE_RANGE,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES,
  PACKAGE_DEFAULT_VERSION,
  PACKAGE_JSON,
  PACKAGE_LOCK_JSON,
  PNPM,
  PNPM_LOCK_YAML,
  PRE_COMMIT,
  PURL_Type,
  README_GLOB,
  README_GLOB_RECURSIVE,
  README_MD,
  REGISTRY,
  REGISTRY_SCOPE_DELIMITER,
  RESOLUTIONS,
  SOCKET_GITHUB_ORG,
  SOCKET_IPC_HANDSHAKE,
  SOCKET_OVERRIDE_SCOPE,
  SOCKET_PUBLIC_API_TOKEN,
  SOCKET_REGISTRY_NPM_ORG,
  SOCKET_REGISTRY_PACKAGE_NAME,
  SOCKET_REGISTRY_REPO_NAME,
  SOCKET_REGISTRY_SCOPE,
  SOCKET_SECURITY_SCOPE,
  SUPPORTS_NODE_COMPILE_CACHE_API,
  SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR,
  SUPPORTS_NODE_DISABLE_WARNING_FLAG,
  SUPPORTS_NODE_PERMISSION_FLAG,
  SUPPORTS_NODE_REQUIRE_MODULE,
  SUPPORTS_NODE_RUN,
  SUPPORTS_PROCESS_SEND,
  TSCONFIG_JSON,
  UNDEFINED_TOKEN,
  UNKNOWN_ERROR,
  UNKNOWN_VALUE,
  UNLICENCED,
  UNLICENSED,
  UTF8,
  VITEST,
  VLT,
  VLT_LOCK_JSON,
  WIN32,
  YARN,
  YARN_BERRY,
  YARN_CLASSIC,
  YARN_LOCK,
  getManifestData,
}

export default SocketSecurityRegistry
