/**
 * @fileoverview Main entry point for Socket Registry v2.0.
 * Clean, organized exports for better developer experience.
 */

// Core module exports
export * as constants from './constants.js'
export * as utils from './utils.js'
export * as packages from './packages.js'
export * as cli from './cli.js'
export * from './types.js'

// Direct exports for commonly used items
export { SocketRegistry } from './packages/registry.js'

// Re-export specific utilities for convenience
export {
  readPackageJson,
  writePackageJson,
  installPackage,
  validatePackageJson,
} from './packages.js'

export {
  logger,
  createSpinner,
  confirm,
  input,
} from './cli.js'

// Version export
export const version = '2.0.0'

// Default export with all modules
export default {
  version,
  constants: await import('./constants.js').then(m => m.default),
  utils: await import('./utils.js'),
  packages: await import('./packages.js'),
  cli: await import('./cli.js'),
}