import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pkgPath = path.join(__dirname, '../package.json')
const constantsDir = path.join(__dirname, '../dist/lib/constants')

async function main() {
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
  const files = await fs.readdir(constantsDir)
  const screamingSnakeNames = files
    .filter(file => path.extname(file) === '.js')
    .map(file => path.basename(file, '.js'))
    .filter(name => /^[A-Z][A-Z0-9_]*$/.test(name))
    .sort()

  let added = 0

  for (const constantName of screamingSnakeNames) {
    const kebab = constantName.toLowerCase().replace(/_/g, '-')
    const kebabKey = `./lib/constants/${kebab}`

    if (!pkg.exports[kebabKey]) {
      pkg.exports[kebabKey] = {
        types: `./dist/lib/constants/${constantName}.d.ts`,
        default: `./dist/lib/constants/${constantName}.js`,
      }
      added += 1
    }
  }

  // Sort exports alphabetically.
  const sortedExports = Object.keys(pkg.exports)
    .sort()
    .reduce((acc, key) => {
      acc[key] = pkg.exports[key]
      return acc
    }, {})

  pkg.exports = sortedExports

  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  console.log(`Added ${added} missing kebab-case exports to package.json`)
}

main().catch(console.error)
