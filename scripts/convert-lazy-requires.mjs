/** @fileoverview Convert lazy require() calls inside test blocks to dynamic imports. */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fastGlob from 'fast-glob'

const { glob } = fastGlob

const testFiles = await glob('test/registry/**/*.test.mts', {
  cwd: resolve(process.cwd()),
  absolute: true,
})

let totalConverted = 0
const convertedFiles = []

for (const file of testFiles) {
  let content = readFileSync(file, 'utf8')
  const originalContent = content

  // Convert simple requires: const foo = require('path')
  content = content.replace(
    /^(\s+)const\s+(\w+)\s*=\s*require\((['"])(\.\.\/.\.\/registry\/dist\/[^'"]+)\3\)/gm,
    (match, indent, varName, quote, path) => {
      totalConverted += 1
      // Only add .js if not already present
      const jsExtension = path.endsWith('.js') ? '' : '.js'
      return `${indent}const ${varName} = await import(${quote}${path}${jsExtension}${quote})`
    },
  )

  // Convert destructured requires: const { foo, bar } = require('path')
  content = content.replace(
    /^(\s+)const\s+\{\s*([^}]+)\s*\}\s*=\s*require\((['"])(\.\.\/.\.\/registry\/dist\/[^'"]+)\3\)/gm,
    (match, indent, imports, quote, path) => {
      totalConverted += 1
      // Only add .js if not already present
      const jsExtension = path.endsWith('.js') ? '' : '.js'
      return `${indent}const {${imports}} = await import(${quote}${path}${jsExtension}${quote})`
    },
  )

  // Now we need to make describe and it callbacks async
  // Find blocks that contain await import
  if (content !== originalContent && content.includes('await import')) {
    // Make describe callbacks async
    content = content.replace(
      /describe\(([^,]+),\s*\(\)\s*=>\s*\{/g,
      'describe($1, async () => {',
    )
    // Make it callbacks async
    content = content.replace(
      /it\(([^,]+),\s*\(\)\s*=>\s*\{/g,
      'it($1, async () => {',
    )
  }

  if (content !== originalContent) {
    writeFileSync(file, content, 'utf8')
    convertedFiles.push(file.replace(process.cwd() + '/', ''))
    console.log(`✓ Converted: ${file.replace(process.cwd() + '/', '')}`)
  }
}

console.log(`\n✅ Total lazy require conversions: ${totalConverted}`)
console.log(`✅ Files modified: ${convertedFiles.length}`)
console.log(`\nNote: Made describe callbacks async to support dynamic imports.`)
