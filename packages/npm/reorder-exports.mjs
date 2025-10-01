import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const packages = [
  'aggregate-error',
  'deep-equal',
  'hyrious__bun.lockb',
  'indent-string',
  'is-arguments',
  'is-array-buffer',
  'is-bigint',
  'is-boolean-object',
  'is-core-module',
  'is-date-object',
  'is-generator-function',
  'is-interactive',
  'is-map',
  'is-number-object',
  'is-regex',
  'is-set',
  'is-shared-array-buffer',
  'is-string',
  'is-symbol',
  'is-typed-array',
  'is-unicode-supported',
  'is-weakmap',
  'is-weakset',
  'yocto-spinner',
]

for (const pkg of packages) {
  const pkgPath = join(pkg, 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'))

  if (!pkgJson.exports) {
    continue
  }

  const exports = pkgJson.exports
  const reordered = {}

  // 1. Add "." first
  if (exports['.']) {
    reordered['.'] = exports['.']
  }

  // 2. Add complex subpaths (objects)
  for (const { 0: key, 1: value } of Object.entries(exports)) {
    if (
      key !== '.' &&
      key !== './package.json' &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      reordered[key] = value
    }
  }

  // 3. Add simple string subpaths
  for (const { 0: key, 1: value } of Object.entries(exports)) {
    if (key !== '.' && key !== './package.json' && typeof value === 'string') {
      reordered[key] = value
    }
  }

  // 4. Add "./package.json" last
  if (exports['./package.json']) {
    reordered['./package.json'] = exports['./package.json']
  }

  pkgJson.exports = reordered
  writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n')
  console.log(`Reordered ${pkg}`)
}
