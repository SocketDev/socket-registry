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
let _PackageURL: typeof import('packageurl-js').PackageURL | undefined

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
  eco?: EcosystemString,
  sockRegPkgName?: string,
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

// Export types and functions
export { Categories, Interop, PURL_Type, getManifestData }

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
  Categories,
  Interop,
  PURL_Type,
  getManifestData,
}

export default SocketSecurityRegistry
