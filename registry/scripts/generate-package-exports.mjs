/** @fileoverview Generate package.json exports from dist/ directory structure. */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import fastGlob from 'fast-glob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registryRoot = path.resolve(__dirname, '..')
const distPath = path.join(registryRoot, 'dist')
const packageJsonPath = path.join(registryRoot, 'package.json')

/**
 * Convert kebab-case to UPPER_SNAKE_CASE.
 */
function toUpperSnakeCase(str) {
  return str
    .replace(/-/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase()
}

/**
 * Check if a file is a constant export.
 */
function isConstantFile(filePath) {
  return filePath.includes('/constants/')
}

/**
 * Generate exports object from dist/ directory.
 */
async function generateExports() {
  const exports = {
    __proto__: null,
  }

  // Add root exports.
  exports['.'] = {
    types: './dist/index.d.ts',
    default: './dist/index.js',
  }
  exports['./index'] = {
    types: './dist/index.d.ts',
    default: './dist/index.js',
  }

  // Find all .js files in dist/
  const jsFiles = await fastGlob('**/*.js', {
    cwd: distPath,
    ignore: ['external/**'],
  })

  for (const file of jsFiles) {
    const relPath = file.replace(/\.js$/, '')
    const dtsPath = `./dist/${relPath}.d.ts`
    const jsPath = `./dist/${file}`

    // Skip index.js (already handled)
    if (relPath === 'index') {
      continue
    }

    // Generate kebab-case export key.
    const kebabKey = `./${relPath}`

    exports[kebabKey] = {
      types: dtsPath,
      default: jsPath,
    }

    // For constants, also add UPPER_SNAKE_CASE version.
    if (isConstantFile(file)) {
      const basename = path.basename(relPath)
      const dirname = path.dirname(relPath)
      const upperKey = `./${dirname}/${toUpperSnakeCase(basename)}`

      exports[upperKey] = {
        types: dtsPath,
        default: jsPath,
      }
    }
  }

  // Add static file exports.
  exports['./extensions.json'] = './extensions.json'
  exports['./manifest.json'] = './manifest.json'
  exports['./package.json'] = './package.json'
  exports['./tsconfig.json'] = './tsconfig.json'

  return exports
}

/**
 * Update package.json with generated exports.
 */
async function updatePackageJson() {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))

  const exports = await generateExports()

  packageJson.exports = exports

  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf8',
  )

  console.log(`✓ Generated ${Object.keys(exports).length} export entries`)
}

updatePackageJson().catch(error => {
  console.error('Failed to generate exports:', error)
  throw error
})
