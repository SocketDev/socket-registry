#!/usr/bin/env node
/**
 * @fileoverview Fix CommonJS exports for constants to be directly exported values.
 * Transforms `exports.default = value` to `module.exports = value` for single-export constant files.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distConstantsDir = path.resolve(__dirname, '..', 'dist', 'lib', 'constants')

async function fixConstantExports() {
  console.log('Fixing CommonJS exports for constants...')

  try {
    const files = await fs.readdir(distConstantsDir)

    for (const file of files) {
      if (!file.endsWith('.js')) continue

      const filePath = path.join(distConstantsDir, file)
      let content = await fs.readFile(filePath, 'utf8')

      // Check if this is a single default export.
      if (content.includes('exports.default =')) {
        // Transform exports.default = value to module.exports = value.
        content = content.replace(/exports\.default = /g, 'module.exports = ')

        // Remove the __esModule marker since we're now using direct CommonJS export.
        content = content.replace(/Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n?/g, '')

        await fs.writeFile(filePath, content)
        console.log(`  Fixed ${file}`)
      }
    }

    console.log('✓ CommonJS exports fixed')
  } catch (error) {
    console.error('Failed to fix CommonJS exports:', error)
    process.exitCode = 1
  }
}

fixConstantExports().catch(error => {
  console.error('Build failed:', error)
  process.exitCode = 1
})