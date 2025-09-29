import { promises as fs } from 'node:fs'
import path from 'node:path'

const constantsDir =
  '/Users/jdalton/projects/socket-registry/registry/src/lib/constants'

async function fixImports(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const filename = path.basename(filePath)

  if (filename === 'index.ts') {
    return false
  }

  // Convert ES imports of constants to require imports
  // Match: import SOMETHING from './SOMETHING'
  const importRegex =
    /^import\s+([A-Z_][A-Z0-9_]*)\s+from\s+['"]\.\/((?:[A-Z_][A-Z0-9_]*(?:_[A-Z0-9]+)*|[a-z]+(?:-[a-z]+)*))(?:\.js)?['"]/gm

  let newContent = content
  let changed = false

  newContent = newContent.replace(importRegex, (match, varName, modulePath) => {
    changed = true
    return `import ${varName} = require('./${modulePath}')`
  })

  if (changed) {
    await fs.writeFile(filePath, newContent, 'utf8')
    return true
  }

  return false
}

async function main() {
  const files = await fs.readdir(constantsDir)
  const tsFiles = files.filter(f => f.endsWith('.ts'))

  let fixed = 0
  for (const file of tsFiles) {
    const filePath = path.join(constantsDir, file)
    // eslint-disable-next-line no-await-in-loop
    if (await fixImports(filePath)) {
      fixed++
      console.log(`✅ Fixed imports in ${file}`)
    }
  }

  console.log(`\nFixed imports in ${fixed} files`)
}

main().catch(console.error)
