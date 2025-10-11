/**
 * @fileoverview Main entry point for Socket Registry v2.0.
 * Clean, organized exports for better developer experience.
 */

// Core module exports
export * as constants from './constants'
export * as utils from './utils'
export * as packages from './packages'
export * as cli from './cli'
export * from './types'

// Direct exports for commonly used items
export { SocketRegistry } from './packages/registry'

// Re-export specific utilities for convenience
export {
  readPackageJson,
  writePackageJson,
  installPackage,
  validatePackageJson,
} from './packages'

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

export {
  logger,
  createSpinner,
  confirm,
  input,
} from './cli'

// Version export
export const version = '2.0.0'

// Default export with all modules
export default {
  version,
  constants: await import('./constants').then(m => m.default),
  utils: await import('./utils'),
  packages: await import('./packages'),
  cli: await import('./cli'),
}