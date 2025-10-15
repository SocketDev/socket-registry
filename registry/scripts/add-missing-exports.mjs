/**
 * Add all missing exports to package.json
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = join(__dirname, '..', 'package.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

// All the exports that need to be added
const additionalExports = {
  './lib/arrays': {
    types: './dist/lib/arrays.d.ts',
    import: './dist/lib/arrays.js',
  },
  './lib/debug': {
    types: './dist/lib/debug.d.ts',
    import: './dist/lib/debug.js',
  },
  './lib/fs': {
    types: './dist/lib/fs.d.ts',
    import: './dist/lib/fs.js',
  },
  './lib/promises': {
    types: './dist/lib/promises.d.ts',
    import: './dist/lib/promises.js',
  },
  './lib/prompts': {
    types: './dist/lib/prompts.d.ts',
    import: './dist/lib/prompts.js',
  },
  './lib/regexps': {
    types: './dist/lib/regexps.d.ts',
    import: './dist/lib/regexps.js',
  },
  './lib/words': {
    types: './dist/lib/words.d.ts',
    import: './dist/lib/words.js',
  },
  './lib/constants/env': {
    types: './dist/lib/constants/env.d.ts',
    import: './dist/lib/constants/env.js',
  },
  './lib/constants/attributes': {
    types: './dist/lib/constants/attributes.d.ts',
    import: './dist/lib/constants/attributes.js',
  },
}

// Add all missing exports
for (const [key, value] of Object.entries(additionalExports)) {
  if (!pkg.exports[key]) {
    pkg.exports[key] = value
    console.log(`Added export: ${key}`)
  }
}

// Sort exports alphabetically (but keep special ones at the end)
const specialExports = new Set(['./package.json'])
const regularExports = {}
const special = {}

for (const [key, value] of Object.entries(pkg.exports)) {
  if (specialExports.has(key)) {
    special[key] = value
  } else {
    regularExports[key] = value
  }
}

// Sort regular exports
const sortedExports = Object.keys(regularExports)
  .sort()
  .reduce((acc, key) => {
    acc[key] = regularExports[key]
    return acc
  }, {})

// Combine sorted regular with special at end
pkg.exports = { ...sortedExports, ...special }

// Write back
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

console.log('✓ Package.json exports updated')
