/** @fileoverview Analyze require() calls to identify top-level (non-lazy) requires. */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fastGlob from 'fast-glob'

const { glob } = fastGlob

const testFiles = await glob('test/registry/**/*.test.mts', {
  cwd: resolve(process.cwd()),
  absolute: true,
})

const topLevelRequires = []
const lazyRequires = []

for (const file of testFiles) {
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n')

  // Find all require() calls with registry/dist
  const requireMatches = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('require') && line.includes('registry/dist')) {
      requireMatches.push({ line: i + 1, content: line })
    }
  }

  // Analyze each require to determine if it's top-level or lazy
  for (const match of requireMatches) {
    const lineNum = match.line
    const lineContent = match.content.trim()

    // Check context - look backwards to see if we're inside a function or it() block
    let isInsideFunction = false

    // Simple heuristic: look backwards for function declarations or it/describe blocks
    for (let i = lineNum - 2; i >= 0; i--) {
      const prevLine = lines[i].trim()

      // Check for function/it/describe/beforeEach markers
      if (
        prevLine.includes('describe(') ||
        prevLine.includes('it(') ||
        prevLine.includes('beforeEach(') ||
        prevLine.includes('afterEach(') ||
        prevLine.includes('function ') ||
        prevLine.includes('=>')
      ) {
        isInsideFunction = true
        break
      }

      // Stop at top of file or imports
      if (i < 5 || prevLine.startsWith('import ')) {
        break
      }
    }

    const entry = {
      file: file.replace(process.cwd() + '/', ''),
      line: lineNum,
      content: lineContent,
    }

    if (isInsideFunction) {
      lazyRequires.push(entry)
    } else {
      topLevelRequires.push(entry)
    }
  }
}

console.log('=== TOP-LEVEL (NON-LAZY) REQUIRES ===')
console.log('These can be safely converted to import statements:\n')

if (topLevelRequires.length === 0) {
  console.log('✅ None found! All requires are lazy-loaded.\n')
} else {
  for (const req of topLevelRequires) {
    console.log(`${req.file}:${req.line}`)
    console.log(`  ${req.content}\n`)
  }
}

console.log(`\n=== LAZY (INSIDE FUNCTION) REQUIRES ===`)
console.log('These must stay as require() for lazy loading:')
console.log(`Total: ${lazyRequires.length} require calls\n`)

console.log(`\nSummary:`)
console.log(`  Top-level requires (can convert): ${topLevelRequires.length}`)
console.log(`  Lazy requires (must keep): ${lazyRequires.length}`)
console.log(`  Total: ${topLevelRequires.length + lazyRequires.length}`)
