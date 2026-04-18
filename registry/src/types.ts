/**
 * @fileoverview Type definitions for Socket Registry.
 */

// Type definitions
export type CategoryString = 'cleanup' | 'levelup' | 'speedup' | 'tuneup'

export type InteropString = 'browserify' | 'cjs' | 'esm'

// Based on SocketPURL_Type from socket-sdk-js
export type PURLString =
  | 'apk'
  | 'bitbucket'
  | 'cargo'
  | 'chrome'
  | 'cocoapods'
  | 'composer'
  | 'conan'
  | 'conda'
  | 'cran'
  | 'deb'
  | 'docker'
  | 'gem'
  | 'generic'
  | 'github'
  | 'golang'
  | 'hackage'
  | 'hex'
  | 'huggingface'
  | 'maven'
  | 'mlflow'
  | 'npm'
  | 'nuget'
  | 'oci'
  | 'pub'
  | 'pypi'
  | 'qpkg'
  | 'rpm'
  | 'swid'
  | 'swift'
  | 'vcs'

// Semantic alias — a PURL string in a Manifest key slot represents an ecosystem.
export type EcosystemString = PURLString

// Manifest types for Socket Registry
export type ManifestEntryData = {
  categories?: CategoryString[] | undefined
  deprecated?: boolean | undefined
  engines?: Record<string, string> | undefined
  interop?: InteropString[] | undefined
  license?: string | undefined
  name: string
  package: string
  version: string
  [key: string]: unknown
}

export type ManifestEntry = [packageName: string, data: ManifestEntryData]

export type Manifest = Record<EcosystemString, ManifestEntry[]>
