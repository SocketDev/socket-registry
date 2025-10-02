import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const constantsDir = path.join(__dirname, 'registry/src/lib/constants')

async function convertConstant(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const filename = path.basename(filePath)

  // Skip index.ts and files that already use export =
  if (filename === 'index.ts' || content.includes('export =')) {
    return false
  }

  // Convert export default to export =
  const newContent = content.replace(/^export default /m, 'export = ')

  if (newContent !== content) {
    await fs.writeFile(filePath, newContent, 'utf8')
    return true
  }

  return false
}

async function main() {
  const files = await fs.readdir(constantsDir)
  const tsFiles = files.filter(f => f.endsWith('.ts'))

  let converted = 0
  for (const file of tsFiles) {
    const filePath = path.join(constantsDir, file)
    // eslint-disable-next-line no-await-in-loop
    if (await convertConstant(filePath)) {
      converted++
      console.log(`✅ Converted ${file}`)
    }
  }

  console.log(`\nConverted ${converted} files to use 'export ='`)
}

main().catch(console.error)
