/**
 * @fileoverview Validate that external dependencies don't reference npm packages.
 * External files must be bundled/vendored code, not re-exports from npm.
 *
 * Usage:
 *   node scripts/validate-external.mjs
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import fastGlob from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const scriptsPath = __dirname
const rootPath = path.join(scriptsPath, '..')
const srcPath = path.join(rootPath, 'src')
const srcExternalPath = path.join(srcPath, 'external')

// Packages that are allowed to be re-exported (must be in dependencies)
// Separate package that depends on registry
const ALLOWED_EXTERNAL_PACKAGES = new Set(['@socketregistry/packageurl-js'])

const FORBIDDEN_PATTERNS = [
  // Match @socketregistry/* imports (except allowed ones)
  {
    isAllowed: match => ALLOWED_EXTERNAL_PACKAGES.has(match),
    message: '@socketregistry/* packages',
    pattern: /@socketregistry\/[\w-]+/g,
  },
  // Match @socketsecurity/* imports - never allowed
  {
    isAllowed: () => false,
    message: '@socketsecurity/* packages',
    pattern: /@socketsecurity\/[\w-]+/g,
  },
]

async function main() {
  try {
    const filepaths = await fastGlob.glob(['**/*.{js,ts}'], {
      absolute: true,
      cwd: srcExternalPath,
    })

    const errors = []

    await Promise.all(
      filepaths.map(async filepath => {
        const content = await fs.readFile(filepath, 'utf8')
        const relPath = path.relative(srcExternalPath, filepath)

        for (const {
          isAllowed,
          message: patternMsg,
          pattern,
        } of FORBIDDEN_PATTERNS) {
          const matches = content.match(pattern)
          if (matches) {
            for (const match of matches) {
              if (!isAllowed(match)) {
                errors.push({
                  file: relPath,
                  match,
                  message: `External file references ${patternMsg} '${match}' - external files must be bundled/vendored code, not re-exports`,
                })
              }
            }
          }
        }
      }),
    )

    if (errors.length > 0) {
      console.error('\n❌ External validation failed:\n')
      for (const error of errors) {
        console.error(`  ${error.file}`)
        console.error(`    ${error.message}`)
      }
      console.error(
        '\n💡 Fix: External files should contain bundled/vendored source code.',
      )
      console.error(
        '    They must NOT re-export from @socketregistry/* or @socketsecurity/* packages.',
      )
      console.error(
        '    Either inline the code or properly bundle these dependencies.\n',
      )
      process.exitCode = 1
    } else {
      console.log('✅ External validation passed')
    }
  } catch (error) {
    console.error('Validate external failed:', error.message)
    process.exitCode = 1
  }
}

main().catch(console.error)
