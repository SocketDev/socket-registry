declare enum Categories {
  CLEANUP = 'cleanup',
  LEVELUP = 'levelup',
  SPEEDUP = 'speedup',
  TUNEUP = 'tuneup'
}
declare type CategoryString = `${Categories}`
declare type EcosystemString = `${PURL_Type}`
declare enum Interop {
  BROWSERIFY = 'browserify',
  CJS = 'cjs',
  ESM = 'esm'
}
declare type InteropString = `${Interop}`
declare type Manifest = {
  [Ecosystem in PURL_Type]: ManifestEntry[]
}
declare type ManifestEntry = [string, ManifestEntryData]
declare type ManifestEntryData = {
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
// Based on https://github.com/SocketDev/socket-sdk-js/blob/v1.4.41/types/api.d.ts#L3292.
declare enum PURL_Type {
  GOLANG = 'golang',
  NPM = 'npm',
  PYPI = 'pypi',
  UNKNOWN = 'unknown'
}
declare const SocketSecurityRegistry: {
  Categories: typeof Categories
  Interop: typeof Interop
  PURL_Type: typeof PURL_Type
  getManifestData(): Manifest
  getManifestData(eco: EcosystemString): ManifestEntry[]
  getManifestData(
    eco: EcosystemString,
    sockRegPkgName: string
  ): ManifestEntryData | undefined
}
declare namespace SocketSecurityRegistry {
  export {
    CategoryString,
    EcosystemString,
    InteropString,
    Manifest,
    ManifestEntry,
    ManifestEntryData
  }
}
export = SocketSecurityRegistry
