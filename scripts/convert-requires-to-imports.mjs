/** @fileoverview Convert CommonJS require() calls to dynamic import() for constants. */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const libDir = './registry/src/lib'

/**
 * Convert require calls to dynamic imports in a file.
 */
function processFile(filePath) {
  const content = readFileSync(filePath, 'utf8')
  let modified = false

  // Convert require('...').default to (await import('...')).default
  let newContent = content.replace(
    /\/\*@__PURE__\*\/\s*require\((['"]\.\/[^'"]+\.js['"])\)\.default/g,
    (match, path) => {
      modified = true
      return `(await import(${path})).default`
    },
  )

  // Convert standalone require('./foo.js')
  newContent = newContent.replace(
    /\/\*@__PURE__\*\/\s*require\((['"]\.\/[^'"]+\.js['"])\)(?!\.default)/g,
    (match, path) => {
      modified = true
      return `(await import(${path})).default`
    },
  )

  if (modified) {
    writeFileSync(filePath, newContent, 'utf8')
    console.log(`Fixed: ${filePath}`)
    return 1
  }
  return 0
}

/**
 * Recursively process all TypeScript files in a directory.
 */
function processDirectory(dir) {
  let count = 0
  const files = readdirSync(dir, { withFileTypes: true })

  for (const file of files) {
    const filePath = join(dir, file.name)

    if (file.isDirectory()) {
      count += processDirectory(filePath)
    } else if (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')) {
      count += processFile(filePath)
    }
  }

  return count
}

console.log('Converting require() calls to dynamic import()...')
const count = processDirectory(libDir)
console.log(`\nConverted ${count} files`)
console.log(
  '\n⚠️  Note: Functions containing these imports will need to be marked as async!',
)
