/** @fileoverview Add .js extensions to lazy require() calls for TypeScript source compatibility. */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fastGlob from 'fast-glob'

const { glob } = fastGlob

const libFiles = await glob('registry/src/lib/**/*.ts', {
  cwd: resolve(process.cwd()),
  absolute: true,
})

let totalFixed = 0
const fixedFiles = []

for (const file of libFiles) {
  let content = readFileSync(file, 'utf8')
  const originalContent = content

  // Fix requires without .js extension (constants and other lib files)
  // Pattern: require('./constants/SOMETHING') or require('./something')
  content = content.replace(
    /require\((['"])(\.\/[^'"]+)(['"])\)/g,
    (match, quote1, path, quote2) => {
      // Skip if already has extension or is in external directory
      if (
        path.endsWith('.js') ||
        path.endsWith('.ts') ||
        path.includes('/external/')
      ) {
        return match
      }
      totalFixed += 1
      return `require(${quote1}${path}.js${quote2})`
    },
  )

  if (content !== originalContent) {
    writeFileSync(file, content, 'utf8')
    fixedFiles.push(file.replace(process.cwd() + '/', ''))
    console.log(`✓ Fixed: ${file.replace(process.cwd() + '/', '')}`)
  }
}

console.log(`\n✅ Total lazy require paths fixed: ${totalFixed}`)
console.log(`✅ Files modified: ${fixedFiles.length}`)
console.log(`\nNote: Added .js extensions for TypeScript source compatibility.`)
