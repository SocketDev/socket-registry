/**
 * @fileoverview Main entry point for Socket Registry v2.0.
 * Clean, organized exports for better developer experience.
 */

// Export types
export * from './types'

// Direct exports for commonly used items
export { SocketRegistry } from './packages/registry'

// Alias for backward compatibility with GitHub version
export { SocketRegistry as SocketSecurityRegistry } from './packages/registry'

// Manifest data helper function
export function getManifestData(ecosystem?: string, packageName?: string) {
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
      return Object.entries(ecoData)
    }

    const pkgData = ecoData[packageName]
    return pkgData ? [packageName, pkgData] : undefined
  } catch {
    return undefined
  }
}

// Version export
export const version = '2.0.0'
