/**
 * @fileoverview Main entry point for Socket Registry v2.0.
 * Provides access to manifest data.
 */

import type { Manifest, ManifestEntry, ManifestEntryData } from './types'

// Export types from types.ts
export * from './types'

// Function overloads for proper typing
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
    const manifestData = require('../manifest.json')

    if (!ecosystem) {
      return manifestData
    }

    const ecoData = manifestData[ecosystem]
    if (!ecoData) {
      return undefined
    }

    if (!packageName) {
      return ecoData
    }

    // ecoData is an array of [purl, data] entries
    if (Array.isArray(ecoData)) {
      const entry = ecoData.find(
        ([_purl, data]) => data.package === packageName,
      )
      return entry ? entry[1] : undefined
    }

    // Fallback for object-based structure
    const pkgData = ecoData[packageName]
    return pkgData ? [packageName, pkgData] : undefined
  } catch {
    return undefined
  }
}

// Version export
export const version = '2.0.0'
