/**
 * @file Main entry point for Socket Registry v2.0. Provides access to manifest
 *   data.
 */

import { createRequire } from 'node:module'

import type { Manifest, ManifestEntry, ManifestEntryData } from './types.mjs'

export * from './types.mjs'

const readRegistryModule = createRequire(import.meta.url)
export function getManifestData(): Manifest
export function getManifestData(ecosystem: string): ManifestEntry[] | undefined
export function getManifestData(
  ecosystem: string,
  packageName: string,
): ManifestEntryData | ManifestEntry | undefined
export function getManifestData(
  ecosystem?: string,
  packageName?: string,
): Manifest | ManifestEntry[] | ManifestEntryData | ManifestEntry | undefined {
  try {
    const manifestData = readRegistryModule('../manifest.json') as Manifest

    if (!ecosystem) {
      return manifestData
    }

    if (!Object.hasOwn(manifestData, ecosystem)) {
      return undefined
    }

    const ecoData: ManifestEntry[] | undefined =
      manifestData[ecosystem as keyof Manifest]
    if (!ecoData) {
      return undefined
    }

    if (!packageName) {
      return ecoData
    }

    // ecoData is an array of [purl, data] entries
    const entry: ManifestEntry | undefined = ecoData.find(
      ([_purl, data]: ManifestEntry) => data.package === packageName,
    )
    return entry ? entry[1] : undefined
  } catch {
    return undefined
  }
}
