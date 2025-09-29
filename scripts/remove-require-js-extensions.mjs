import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const libDir = './registry/src/lib'

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf8')
  let modified = false

  // Remove .js extensions from require() calls with relative paths
  // Pattern: require('./something.js') or require('../something.js')
  const requireRegex = /require\((['"])(\.\.?\/[^'"]+)\.js(['"])\)/g

  const newContent = content.replace(
    requireRegex,
    (match, quote1, path, quote2) => {
      modified = true
      return `require(${quote1}${path}${quote2})`
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
