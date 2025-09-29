/** @fileoverview Convert ONLY top-level require() calls to import statements in test files. */

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
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n')

  // Only convert requires that appear before any describe() or it() blocks
  let firstTestBlockLine = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (
      line.includes('describe(') ||
      line.includes('it(') ||
      line.includes('beforeEach(') ||
      line.includes('afterEach(')
    ) {
      firstTestBlockLine = i
      break
    }
  }

  if (firstTestBlockLine === -1) {
    firstTestBlockLine = lines.length
  }

  // Extract top portion (before test blocks)
  const topLines = lines.slice(0, firstTestBlockLine)
  const restLines = lines.slice(firstTestBlockLine)

  let topContent = topLines.join('\n')
  const restContent = restLines.join('\n')

  let fileModified = false

  // Convert destructured requires: const { foo, bar } = require('path')
  topContent = topContent.replace(
    /const\s+\{\s*([^}]+)\s*\}\s*=\s*require\((['"])(\.\.\/\.\.\/registry\/dist\/[^'"]+)\2\)/g,
    (match, imports, quote, path) => {
      totalConverted++
      fileModified = true
      return `import {${imports}} from ${quote}${path}.js${quote}`
    },
  )

  // Convert simple requires: const foo = require('path')
  topContent = topContent.replace(
    /const\s+(\w+)\s*=\s*require\((['"])(\.\.\/\.\.\/registry\/dist\/[^'"]+)\2\)/g,
    (match, varName, quote, path) => {
      totalConverted++
      fileModified = true
      return `import ${varName} from ${quote}${path}.js${quote}`
    },
  )

  // Convert @socketsecurity/registry requires
  topContent = topContent.replace(
    /const\s+\{\s*([^}]+)\s*\}\s*=\s*require\((['"])@socketsecurity\/registry\2\)/g,
    (match, imports, quote) => {
      totalConverted++
      fileModified = true
      return `import {${imports}} from ${quote}@socketsecurity/registry${quote}`
    },
  )

  if (fileModified) {
    const newContent = topContent + '\n' + restContent
    writeFileSync(file, newContent, 'utf8')
    convertedFiles.push(file.replace(process.cwd() + '/', ''))
    console.log(`✓ Converted: ${file.replace(process.cwd() + '/', '')}`)
  }
}

console.log(`\n✅ Total top-level require conversions: ${totalConverted}`)
console.log(`✅ Files modified: ${convertedFiles.length}`)
console.log(`\nNote: Lazy requires inside test blocks were left unchanged.`)
