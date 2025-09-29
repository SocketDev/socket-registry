/** @fileoverview Audit all require() calls in source and test files. */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fastGlob from 'fast-glob'

const { glob } = fastGlob

// Analyze source files
const srcFiles = await glob('registry/src/**/*.{ts,js}', {
  cwd: resolve(process.cwd()),
  absolute: true,
  ignore: ['**/external/**'],
})

// Analyze test files
const testFiles = await glob('test/registry/**/*.test.mts', {
  cwd: resolve(process.cwd()),
  absolute: true,
})

function analyzeFile(filePath, content) {
  const lines = content.split('\n')
  const requires = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('require(') && !line.trim().startsWith('//')) {
      const lineNum = i + 1
      const lineContent = line.trim()

      // Check if inside a function
      let isLazy = false
      let context = ''

      // Look backwards for function/class context
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j].trim()

        // Check for function declarations
        if (
          prevLine.includes('function ') ||
          prevLine.includes('=>') ||
          prevLine.includes('it(') ||
          prevLine.includes('describe(') ||
          prevLine.includes('beforeEach(') ||
          prevLine.includes('afterEach(')
        ) {
          isLazy = true
          context = prevLine.substring(0, 50)
          break
        }

        // Stop at beginning of file or module-level code
        if (j < 3) {
          break
        }
      }

      requires.push({
        line: lineNum,
        content: lineContent,
        isLazy,
        context,
      })
    }
  }

  return requires
}

const srcResults = {}
const testResults = {}

// Analyze source files
for (const file of srcFiles) {
  const content = readFileSync(file, 'utf8')
  const requires = analyzeFile(file, content)

  if (requires.length > 0) {
    srcResults[file.replace(process.cwd() + '/', '')] = requires
  }
}

// Analyze test files
for (const file of testFiles) {
  const content = readFileSync(file, 'utf8')
  const requires = analyzeFile(file, content)

  if (requires.length > 0) {
    testResults[file.replace(process.cwd() + '/', '')] = requires
  }
}

console.log('='.repeat(80))
console.log('SOURCE CODE FILES (registry/src/)')
console.log('='.repeat(80))

let srcTopLevel = 0
let srcLazy = 0

for (const [file, requires] of Object.entries(srcResults)) {
  const topLevel = requires.filter(r => !r.isLazy)
  const lazy = requires.filter(r => r.isLazy)

  srcTopLevel += topLevel.length
  srcLazy += lazy.length

  console.log(`\n${file}:`)
  console.log(`  Total requires: ${requires.length}`)
  console.log(`  Top-level (can convert): ${topLevel.length}`)
  console.log(`  Lazy (must keep): ${lazy.length}`)

  if (topLevel.length > 0) {
    console.log(`\n  ⚠️  Top-level requires that could be converted:`)
    for (const req of topLevel) {
      console.log(`    Line ${req.line}: ${req.content}`)
    }
  }

  if (lazy.length > 0 && lazy.length <= 5) {
    console.log(`\n  ✓ Lazy requires (correct):`)
    for (const req of lazy) {
      console.log(`    Line ${req.line}: ${req.content}`)
      if (req.context) {
        console.log(`      Context: ${req.context}`)
      }
    }
  }
}

console.log('\n' + '='.repeat(80))
console.log('TEST FILES (test/registry/)')
console.log('='.repeat(80))

let testTopLevel = 0
let testLazy = 0

for (const [_file, requires] of Object.entries(testResults)) {
  const topLevel = requires.filter(r => !r.isLazy)
  const lazy = requires.filter(r => r.isLazy)

  testTopLevel += topLevel.length
  testLazy += lazy.length
}

console.log(
  `\nTotal test files with requires: ${Object.keys(testResults).length}`,
)
console.log(`  Top-level requires (SHOULD CONVERT): ${testTopLevel}`)
console.log(`  Lazy requires (keep as-is): ${testLazy}`)

console.log('\n' + '='.repeat(80))
console.log('SUMMARY')
console.log('='.repeat(80))

console.log(`\nSource files:`)
console.log(`  Top-level requires: ${srcTopLevel}`)
console.log(`  Lazy requires: ${srcLazy}`)
console.log(`  Total: ${srcTopLevel + srcLazy}`)

console.log(`\nTest files:`)
console.log(`  Top-level requires: ${testTopLevel}`)
console.log(`  Lazy requires: ${testLazy}`)
console.log(`  Total: ${testTopLevel + testLazy}`)

console.log(`\nGrand Total: ${srcTopLevel + srcLazy + testTopLevel + testLazy}`)

console.log(`\n${'='.repeat(80)}`)
console.log('RECOMMENDATION')
console.log('='.repeat(80))

if (testTopLevel > 0) {
  console.log(
    `\n✅ Convert ${testTopLevel} top-level requires in TEST FILES to import`,
  )
  console.log(
    `   This will enable coverage to map to src/ files via resolve.alias`,
  )
}

if (srcTopLevel > 0) {
  console.log(`\n⚠️  Found ${srcTopLevel} top-level requires in SOURCE FILES`)
  console.log(
    `   Review these carefully - they may prevent proper tree-shaking`,
  )
  console.log(`   Consider converting if they don't need lazy loading`)
}

if (srcLazy > 0) {
  console.log(
    `\n✓ ${srcLazy} lazy requires in source files are correct (keep as-is)`,
  )
}
if (testLazy > 0) {
  console.log(
    `\n✓ ${testLazy} lazy requires in test files are correct (keep as-is)`,
  )
}
