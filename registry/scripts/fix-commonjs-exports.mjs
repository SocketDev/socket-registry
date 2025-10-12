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
const distConstantsDir = path.resolve(
  __dirname,
  '..',
  'dist',
  'lib',
  'constants',
)

async function fixConstantExports() {
  printHeader('Fixing CommonJS Exports')

  try {
    const files = await fs.readdir(distConstantsDir)

    for (const file of files) {
      if (!file.endsWith('.js')) {
        continue
      }

      const filePath = path.join(distConstantsDir, file)
      // eslint-disable-next-line no-await-in-loop
      let content = await fs.readFile(filePath, 'utf8')

      // Check if this is a single default export.
      if (content.includes('exports.default =')) {
        // Transform exports.default = value to module.exports = value.
        content = content.replace(/exports\.default = /g, 'module.exports = ')

        // Remove the __esModule marker since we're now using direct CommonJS export.
        content = content.replace(
          /Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n?/g,
          '',
        )

        // eslint-disable-next-line no-await-in-loop
        await fs.writeFile(filePath, content)
        console.log(`    Fixed ${file}`)
      }
    }

    printSuccess('CommonJS exports fixed')
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
