import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import fastGlob from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const registryPath = path.join(__dirname, '..', 'registry')
const packageJsonPath = path.join(registryPath, 'package.json')

async function main() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))

  // Find all files in dist directory
  const distFiles = await fastGlob.glob(['dist/**/*.{js,d.ts}'], {
    cwd: registryPath,
    ignore: ['node_modules/**', '**/*.test.*'],
  })

  // Also include JSON files at root.
  const jsonFiles = [
    'extensions.json',
    'manifest.json',
    'package.json',
    'tsconfig.json',
  ]

  // Add JSON files.
  const exports = {}
  for (const jsonFile of jsonFiles) {
    exports[`./${jsonFile}`] = `./${jsonFile}`
  }

  // Process dist files.
  for (const file of distFiles) {
    const ext = file.endsWith('.d.ts') ? '.d.ts' : path.extname(file)
    const relativePath = file.slice('dist/'.length)
    const exportPath = `./${relativePath.slice(0, -ext.length)}`
    const isDts = ext === '.d.ts'

    if (exports[exportPath]) {
      exports[exportPath][isDts ? 'types' : 'default'] = `./${file}`
    } else {
      exports[exportPath] = {
        types: isDts ? `./${file}` : undefined,
        default: isDts ? undefined : `./${file}`,
      }
    }

    // Clean up single property objects.
    if (exports[exportPath].types === undefined) {
      exports[exportPath] = exports[exportPath].default
    } else if (exports[exportPath].default === undefined) {
      delete exports[exportPath].default
    }

    // Add index exports for directories.
    const basename = path.basename(relativePath, ext)
    if (basename === 'index') {
      const dirPath = `./${path.dirname(relativePath)}`
      if (dirPath !== './.') {
        if (exports[dirPath]) {
          exports[dirPath][isDts ? 'types' : 'default'] = `./${file}`
        } else {
          exports[dirPath] = {
            types: isDts ? `./${file}` : undefined,
            default: isDts ? undefined : `./${file}`,
          }
        }
        // Clean up single property objects.
        if (exports[dirPath].types === undefined) {
          exports[dirPath] = exports[dirPath].default
        } else if (exports[dirPath].default === undefined) {
          delete exports[dirPath].default
        }
      }
    }
  }

  // Add dual exports for constants (both lowercase and uppercase).
  const constantsExports = {}
  for (const [exportPath, exportValue] of Object.entries(exports)) {
    if (
      exportPath.startsWith('./lib/constants/') &&
      exportPath !== './lib/constants'
    ) {
      const pathAfterConstants = exportPath.slice('./lib/constants/'.length)

      // Always add the lowercase-hyphenated version.
      const lowercasePath = `./lib/constants/${pathAfterConstants.toLowerCase().replace(/_/g, '-')}`
      constantsExports[lowercasePath] = exportValue

      // Always add the UPPERCASE_UNDERSCORE version.
      const uppercasePath = `./lib/constants/${pathAfterConstants.toUpperCase().replace(/-/g, '_')}`
      constantsExports[uppercasePath] = exportValue
    }
  }

  // Merge all exports.
  Object.assign(exports, constantsExports)

  // Sort exports.
  const sortedExports = {}
  const sortedKeys = Object.keys(exports).sort()
  for (const key of sortedKeys) {
    sortedExports[key] = exports[key]
  }

  // Add browser field for Node.js built-ins.
  const browser = {}
  const builtinNames = [
    'assert',
    'buffer',
    'child_process',
    'cluster',
    'console',
    'constants',
    'crypto',
    'dgram',
    'dns',
    'domain',
    'events',
    'fs',
    'http',
    'https',
    'module',
    'net',
    'os',
    'path',
    'process',
    'punycode',
    'querystring',
    'readline',
    'stream',
    'string_decoder',
    'sys',
    'timers',
    'tls',
    'tty',
    'url',
    'util',
    'vm',
    'zlib',
  ]
  for (const name of builtinNames) {
    browser[name] = false
  }

  packageJson.exports = sortedExports
  packageJson.browser = browser

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log(
    `✅ Created ${Object.keys(sortedExports).length} exports in registry/package.json`,
  )
  console.log(
    `   Including ${Object.keys(constantsExports).length / 2} dual constant exports`,
  )
}

main().catch(console.error)
