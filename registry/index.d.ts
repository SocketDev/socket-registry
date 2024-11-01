declare enum PURL_Type {
  NPM = 'npm'
}
declare namespace SocketSecurityRegistry {
  export enum Categories {
    CLEANUP = 'cleanup',
    LEVELUP = 'levelup',
    SPEEDUP = 'speedup',
    TUNEUP = 'tuneup'
  }
  export type CategoryString = `${Categories}`
  export type EcosystemString = `${PURL_Type}`
  export enum Interop {
    BROWSERIFY = 'browserify',
    CJS = 'cjs',
    ESM = 'esm'
  }
  export type InteropString = `${Interop}`
  export type Manifest = {
    [Ecosystem in PURL_Type]: ManifestEntry[]
  }
  export type ManifestEntry = [string, ManifestEntryData]
  export type ManifestEntryData = {
    categories: CategoryString[]
    interop: InteropString[]
    license: string
    name: string
    package: string
    version: string
    deprecated?: boolean
    engines: {
      node: string
      npm?: string
    }
    skipTests?: boolean
  }
  export function getManifestData(): Manifest | undefined
  export function getManifestData(
    eco: EcosystemString
  ): ManifestEntry[] | undefined
  export function getManifestData(
    eco: EcosystemString,
    regPkgName: string
  ): ManifestEntryData | undefined
}
export = SocketSecurityRegistry
