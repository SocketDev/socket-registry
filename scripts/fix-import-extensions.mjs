import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const libDir = './registry/src/lib'

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf8')
  let modified = false

  // Match import statements with relative paths missing .js extension
  // Patterns:
  // import foo from './bar'
  // import { foo } from './bar'
  // import type { Foo } from './bar'
  const importRegex =
    /^(import(?:\s+type)?\s+(?:{[^}]+}|[^{}\s]+)\s+from\s+)(['"])(\.\/[^'"]+)(['"])/gm

  const newContent = content.replace(
    importRegex,
    (match, prefix, quote1, path, quote2) => {
      // Skip if already has extension
      if (
        path.endsWith('.js') ||
        path.endsWith('.ts') ||
        path.endsWith('.mts') ||
        path.endsWith('.cts')
      ) {
        return match
      }
      // Skip external imports (should not have relative path)
      if (!path.startsWith('./') && !path.startsWith('../')) {
        return match
      }
      modified = true
      return `${prefix}${quote1}${path}.js${quote2}`
    },
  )

  if (modified) {
    writeFileSync(filePath, newContent, 'utf8')
    console.log(`Fixed: ${filePath}`)
    return 1
  }
  return 0
}

function processDirectory(dir) {
  let count = 0
  const files = readdirSync(dir, { withFileTypes: true })

  for (const file of files) {
    const filePath = join(dir, file.name)

    if (file.isDirectory()) {
      count += processDirectory(filePath)
    } else if (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')) {
      count += processFile(filePath)
    }
  }

  return count
}

const count = processDirectory(libDir)
console.log(`\nFixed ${count} files`)
