/**
 * @fileoverview Fix CommonJS exports for constants to be directly exported values.
 * Transforms `exports.default = value` to `module.exports = value` for single-export constant files.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  printError,
  printFooter,
  printHeader,
  printSuccess,
} from '../../scripts/utils/cli-helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')

/**
 * Process files in a directory and fix CommonJS exports.
 */
async function processDirectory(dir) {
  let fixedCount = 0

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        fixedCount += await processDirectory(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        let content = await fs.readFile(fullPath, 'utf8')

        // Check if this is a single default export.
        if (content.includes('exports.default =')) {
          // Transform exports.default = value to module.exports = value.
          content = content.replace(/exports\.default = /g, 'module.exports = ')

          // Remove the __esModule marker since we're now using direct CommonJS export.
          content = content.replace(
            /Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n?/g,
            '',
          )

          await fs.writeFile(fullPath, content)
          const relativePath = path.relative(distDir, fullPath)
          console.log(`    Fixed ${relativePath}`)
          fixedCount += 1
        }
      }
    }
  } catch (error) {
    // Skip directories that don't exist.
    if (error.code !== 'ENOENT') {
      throw error
    }
  }

  return fixedCount
}

async function fixConstantExports() {
  printHeader('Fixing CommonJS Exports')

  try {
    const fixedCount = await processDirectory(distDir)

    if (fixedCount > 0) {
      printSuccess(`Fixed ${fixedCount} file${fixedCount === 1 ? '' : 's'}`)
    } else {
      printSuccess('No files needed fixing')
    }
    printFooter()
  } catch (error) {
    printError(`Failed to fix CommonJS exports: ${error.message}`)
    process.exitCode = 1
  }
}

fixConstantExports().catch(error => {
  printError(`Build failed: ${error.message || error}`)
  process.exitCode = 1
})
