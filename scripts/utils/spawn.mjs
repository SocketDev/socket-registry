/**
 * @fileoverview Spawn utilities wrapper for scripts.
 * Provides access to the registry's spawn module for scripts.
 */

import { createRequire } from 'node:module'

// Create require for CommonJS modules.
const require = createRequire(import.meta.url)

// Import the CommonJS spawn module.
const spawnModule = require('../../registry/dist/lib/process/spawn.js')

// Re-export spawn functions.
export const spawn = spawnModule.spawn
export const spawnSync = spawnModule.spawnSync
export const isSpawnError = spawnModule.isSpawnError
export const isStdioType = spawnModule.isStdioType

// Default export for compatibility.
export default spawnModule