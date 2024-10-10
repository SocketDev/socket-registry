declare enum Categories {
  CLEANUP = 'cleanup',
  LEVELUP = 'levelup',
  SPEEDUP = 'speedup',
  TUNEUP = 'tuneup'
}
declare type CategoryString = `${Categories}`
declare enum PURL_Type {
  NPM = 'npm'
}
declare type EcosystemString = `${PURL_Type}`
declare enum Interop {
  BROWSERIFY = 'browserify',
  CJS = 'cjs',
  ESM = 'esm'
}
declare type InteropString = `${Interop}`
declare type ManifestData = {
  categories: CategoryString[]
  interop: InteropString[]
  license: string
  package: string
  version: string
  deprecated?: boolean
  engines?: { node: string; npm?: string }
  skipTests?: boolean
}
declare interface SocketSecurityRegistry {
  getManifestData(
    eco: EcosystemString,
    regPkgName: string
  ): ManifestData | undefined
}
declare const registry: SocketSecurityRegistry
export = registry
