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
  name: string
  versions: Record<string, any> // Manifest objects.
  'dist-tags': { latest: string } & Record<string, string>
  time?: PackageTime | undefined
  // Additional metadata fields.
  maintainers: PackagePerson[]
  author?: PackagePerson | undefined
  repository?: PackageRepository | undefined
  readme?: string | undefined
  readmeFilename?: string | undefined
  homepage?: string | undefined
  bugs?: PackageBugs | undefined
  license?: string | undefined
  keywords?: string[] | undefined
  users?: Record<string, boolean> | undefined
}

const packumentCache = new Map<string, Packument>()
export default packumentCache
