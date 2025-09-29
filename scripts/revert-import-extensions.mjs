import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const libDir = './registry/src/lib'

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf8')
  let modified = false

  // Remove .js extensions from import statements with relative paths
  // Keep require() with .js extensions - those are needed for compiled output
  const importRegex =
    /^(import(?:\s+type)?\s+(?:{[^}]+}|[^{}\s]+)\s+from\s+)(['"])(\.\/[^'"]+)\.js(['"])/gm

  const newContent = content.replace(
    importRegex,
    (match, prefix, quote1, path, quote2) => {
      modified = true
      return `${prefix}${quote1}${path}${quote2}`
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
