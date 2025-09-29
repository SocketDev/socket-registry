// Type definitions for packument-cache

// Type for a person (author, maintainer, contributor).
export type PackagePerson = {
  name: string
  email?: string | undefined
  url?: string | undefined
}

// Type for repository information.
export type PackageRepository = {
  type?: string | undefined
  url?: string | undefined
  directory?: string | undefined
}

// Type for bugs information.
export type PackageBugs = {
  url?: string | undefined
  email?: string | undefined
}

// Type for time metadata.
export type PackageTime = {
  created: string
  modified: string
  [version: string]: string
}

// Duplicated from pacote package - packument type.
export type Packument = {
  // Additional metadata fields.
  author?: PackagePerson | undefined
  bugs?: PackageBugs | undefined
  'dist-tags': { latest: string } & Record<string, string>
  homepage?: string | undefined
  keywords?: string[] | undefined
  license?: string | undefined
  maintainers: PackagePerson[]
  name: string
  readme?: string | undefined
  readmeFilename?: string | undefined
  repository?: PackageRepository | undefined
  time?: PackageTime | undefined
  users?: Record<string, boolean> | undefined
  // Manifest objects.
  versions: Record<string, any>
}

declare const packumentCache: Map<string, Packument>
export default packumentCache
