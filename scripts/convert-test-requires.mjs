/** @fileoverview Convert require() calls to import statements in test files. */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fastGlob from 'fast-glob'

const { glob } = fastGlob

const testFiles = await glob('test/registry/**/*.test.mts', {
  cwd: resolve(process.cwd()),
  absolute: true,
})

let totalConverted = 0

for (const file of testFiles) {
  const content = readFileSync(file, 'utf8')
  let modified = content

  // Match: const { foo, bar } = require('../../registry/dist/lib/path')
  // Convert to: import { foo, bar } from '../../registry/dist/lib/path.js'
  modified = modified.replace(
    /const\s+\{\s*([^}]+)\s*\}\s*=\s*require\((['"])(\.\.\/\.\.\/registry\/dist\/[^'"]+)\.js\2\)/g,
    (match, imports, quote, path) => {
      totalConverted++
      return `import {${imports}} from ${quote}${path}.js${quote}`
    },
  )

  // Match: const { foo, bar } = require('../../registry/dist/lib/path')
  // Convert to: import { foo, bar } from '../../registry/dist/lib/path.js'
  modified = modified.replace(
    /const\s+\{\s*([^}]+)\s*\}\s*=\s*require\((['"])(\.\.\/\.\.\/registry\/dist\/[^'"]+)\2\)/g,
    (match, imports, quote, path) => {
      totalConverted++
      return `import {${imports}} from ${quote}${path}.js${quote}`
    },
  )

  // Match: const foo = require('../../registry/dist/lib/path')
  // Convert to: import foo from '../../registry/dist/lib/path.js'
  modified = modified.replace(
    /const\s+(\w+)\s*=\s*require\((['"])(\.\.\/\.\.\/registry\/dist\/[^'"]+)\.js\2\)/g,
    (match, varName, quote, path) => {
      totalConverted++
      return `import ${varName} from ${quote}${path}.js${quote}`
    },
  )

  // Match: const foo = require('../../registry/dist/lib/path')
  // Convert to: import foo from '../../registry/dist/lib/path.js'
  modified = modified.replace(
    /const\s+(\w+)\s*=\s*require\((['"])(\.\.\/\.\.\/registry\/dist\/[^'"]+)\2\)/g,
    (match, varName, quote, path) => {
      totalConverted++
      return `import ${varName} from ${quote}${path}.js${quote}`
    },
  )

  // Match: const foo = require('@socketsecurity/registry')
  // Convert to: import { getManifestData } from '@socketsecurity/registry'
  modified = modified.replace(
    /const\s+\{\s*([^}]+)\s*\}\s*=\s*require\((['"])@socketsecurity\/registry\2\)/g,
    (match, imports, quote) => {
      totalConverted++
      return `import {${imports}} from ${quote}@socketsecurity/registry${quote}`
    },
  )

  if (modified !== content) {
    writeFileSync(file, modified, 'utf8')
    console.log(`✓ Converted: ${file.replace(process.cwd() + '/', '')}`)
  }
}

console.log(`\n✅ Total conversions: ${totalConverted}`)
console.log(`\nNote: This converted ALL requires, including lazy ones.`)
console.log(`Tests will verify if the conversions are safe.`)
