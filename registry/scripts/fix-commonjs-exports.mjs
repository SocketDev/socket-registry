/**
 * @fileoverview Post-build script to fix CommonJS exports for constants.
 * Transforms `exports.default = value` to `module.exports = value` for better CommonJS compatibility.
 * Also fixes imports to not use .default when the constant has been fixed.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const distDir = path.join(__dirname, '..', 'dist')
const constantsDir = path.join(distDir, 'lib', 'constants')

// Files that should keep export default because they have type exports
const KEEP_DEFAULT_EXPORT = new Set([
  'ipc-handler.js',
  'ipc-object.js',
  'packument-cache.js',
])

// Track which constants were fixed so we can update imports
const fixedConstants = new Set()

async function fixFile(filePath) {
  const filename = path.basename(filePath)

  // Skip files that need to keep default export
  if (KEEP_DEFAULT_EXPORT.has(filename)) {
    return
  }

  // Skip index.js and non-js files
  if (filename === 'index.js' || !filename.endsWith('.js')) {
    return
  }

  let content = await fs.readFile(filePath, 'utf8')

  // Check if this file only has exports.default and no other named exports
  const hasDefaultExport = content.includes('exports.default =')
  const exportMatches = content.match(/exports\.\w+ =/g) || []
  const hasOnlyDefaultExport = hasDefaultExport && exportMatches.length === 1

  if (hasOnlyDefaultExport) {
    // Transform exports.default = value to module.exports = value
    content = content.replace(
      /exports\.default = (.+);/,
      'module.exports = $1;',
    )

    // Remove the __esModule marker since we're doing direct CommonJS export
    content = content.replace(
      /Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n/,
      '',
    )

    await fs.writeFile(filePath, content, 'utf8')

    // Track that this constant was fixed (remove .js extension)
    const constantName = filename.replace('.js', '')
    fixedConstants.add(constantName)

    console.log(`✅ Fixed CommonJS export for ${filename}`)
  }
}

async function fixImportsInFile(filePath, fixedConstants) {
  let content = await fs.readFile(filePath, 'utf8')
  let modified = false

  // Fix requires that use .default for fixed constants
  for (const constantName of fixedConstants) {
    const pattern = new RegExp(
      `require\\('./constants/${constantName}'\\)\\.default`,
      'g',
    )
    if (content.match(pattern)) {
      content = content.replace(
        pattern,
        `require('./constants/${constantName}')`,
      )
      modified = true
    }
  }

  if (modified) {
    await fs.writeFile(filePath, content, 'utf8')
    console.log(`✅ Fixed imports in ${path.basename(filePath)}`)
  }
}

async function fixAllImports(fixedConstants) {
  // Fix imports in all JS files in dist/lib
  const libDir = path.join(distDir, 'lib')
  const files = await fs.readdir(libDir)

  await Promise.all(
    files
      .filter(f => f.endsWith('.js'))
      .map(file => fixImportsInFile(path.join(libDir, file), fixedConstants)),
  )

  // Also fix in dist/index.js
  const indexPath = path.join(distDir, 'index.js')
  if (await fs.stat(indexPath).catch(() => false)) {
    await fixImportsInFile(indexPath, fixedConstants)
  }
}

async function main() {
  try {
    const files = await fs.readdir(constantsDir)

    // First pass: fix exports
    await Promise.all(files.map(file => fixFile(path.join(constantsDir, file))))

    // Second pass: fix imports that reference the fixed constants
    if (fixedConstants.size > 0) {
      console.log(`\n📝 Fixing imports for ${fixedConstants.size} constants...`)
      await fixAllImports(fixedConstants)
    }

    console.log('✨ CommonJS exports and imports fixed!')
  } catch (error) {
    console.error('Error fixing CommonJS exports:', error)
    throw error
  }
}

main()
