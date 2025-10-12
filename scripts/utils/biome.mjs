/**
 * @fileoverview Biome formatter wrapper for scripts.
 * Provides access to the registry's Biome formatting utilities.
 */

import { createRequire } from 'node:module'

// Create require for CommonJS modules.
const require = createRequire(import.meta.url)

// Import the Biome formatter from the registry.
const { biomeFormat } = require('../../registry/dist/lib/formatters/biome.js')

// Re-export the biomeFormat function.
export { biomeFormat }
