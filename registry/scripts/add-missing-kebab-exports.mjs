import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = join(__dirname, '..', 'package.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

const missingMappings = [
  { caps: 'BUN', file: 'BUN' },
  { caps: 'CI', file: 'CI' },
  { caps: 'DARWIN', file: 'DARWIN' },
  { caps: 'ENV', file: 'ENV' },
  { caps: 'ESNEXT', file: 'ESNEXT' },
  { caps: 'EXTENSIONS', file: 'EXTENSIONS' },
  { caps: 'GITIGNORE', file: 'GITIGNORE' },
  { caps: 'LATEST', file: 'LATEST' },
  { caps: 'LICENSE', file: 'LICENSE' },
  { caps: 'MIT', file: 'MIT' },
  { caps: 'NPM', file: 'NPM' },
  { caps: 'NPX', file: 'NPX' },
  { caps: 'OVERRIDES', file: 'OVERRIDES' },
  { caps: 'PNPM', file: 'PNPM' },
  { caps: 'REGISTRY', file: 'REGISTRY' },
  { caps: 'RESOLUTIONS', file: 'RESOLUTIONS' },
  { caps: 'UNLICENCED', file: 'UNLICENCED' },
  { caps: 'UNLICENSED', file: 'UNLICENSED' },
  { caps: 'UTF8', file: 'UTF8' },
  { caps: 'VITEST', file: 'VITEST' },
  { caps: 'VLT', file: 'VLT' },
  { caps: 'WIN32', file: 'WIN32' },
  { caps: 'YARN', file: 'YARN' },
  { caps: 'YARN_BERRY', file: 'YARN_BERRY' },
]

let added = 0

for (const { caps, file } of missingMappings) {
  const kebab = caps.toLowerCase().replace(/_/g, '-')
  const kebabKey = `./lib/constants/${kebab}`

  // Check if kebab-case already exists
  if (!pkg.exports[kebabKey]) {
    pkg.exports[kebabKey] = {
      types: `./dist/lib/constants/${file}.d.ts`,
      default: `./dist/lib/constants/${file}.js`,
    }
    added += 1
  }
}

// Sort exports alphabetically
const sortedExports = Object.keys(pkg.exports)
  .sort()
  .reduce((acc, key) => {
    acc[key] = pkg.exports[key]
    return acc
  }, {})

pkg.exports = sortedExports

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log(`Added ${added} missing kebab-case exports to package.json`)
