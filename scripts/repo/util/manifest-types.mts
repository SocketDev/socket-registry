/**
 * @file Shared registry-manifest and npm-manifest type shapes reused across
 *   the template, override, publish, and release scripts.
 */

export interface ManifestEntryData {
  categories: string[]
  deprecated: boolean
  engines: { node: string }
  interop: string[]
  license: string
  name: string
  package: string
  version: string
}

export type ManifestEntry = [string, ManifestEntryData]

export type RegistryManifest = Record<string, ManifestEntry[]>

export interface NpmManifest {
  version: string
}
