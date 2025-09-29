/** @fileoverview Convert lazy require() calls to dynamic import() for TypeScript source compatibility. */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fastGlob from 'fast-glob'

const { glob } = fastGlob

const libFiles = await glob('registry/src/lib/**/*.ts', {
  cwd: resolve(process.cwd()),
  absolute: true,
})

let totalConverted = 0
const convertedFiles = []

for (const file of libFiles) {
  let content = readFileSync(file, 'utf8')
  const originalContent = content

  // Convert constant requires with default export to dynamic imports
  // Pattern: require('./constants/SOMETHING.js').default
  content = content.replace(
    /\/\*@__PURE__\*\/\s*require\((['"])(\.\/constants\/[^'"]+\.js)(['"])\)\.default/g,
    (match, quote1, path, quote2) => {
      totalConverted += 1
      return `(await import(${quote1}${path}${quote2})).default`
    },
  )

  // Convert constant requires without .default to dynamic imports
  // Pattern: require('./constants/SOMETHING.js')
  content = content.replace(
    /\/\*@__PURE__\*\/\s*require\((['"])(\.\/constants\/[^'"]+\.js)(['"])\)/g,
    (match, quote1, path, quote2) => {
      totalConverted += 1
      return `(await import(${quote1}${path}${quote2})).default`
    },
  )

  // Now mark functions as async if they contain await
  if (content !== originalContent && content.includes('await import')) {
    // Find functions that need to be async
    // This is a simplified approach - we'll mark export functions and internal functions
    content = content.replace(
      /^(export\s+function\s+\w+[^{]*)\{/gm,
      (match, funcDecl) => {
        // Check if this function or its body contains await
        return funcDecl.includes('async')
          ? match
          : `${funcDecl.trim()} {`.replace('function', 'async function')
      },
    )
  }

  if (content !== originalContent) {
    writeFileSync(file, content, 'utf8')
    convertedFiles.push(file.replace(process.cwd() + '/', ''))
    console.log(`✓ Converted: ${file.replace(process.cwd() + '/', '')}`)
  }
}

console.log(
  `\n✅ Total lazy require → dynamic import conversions: ${totalConverted}`,
)
console.log(`✅ Files modified: ${convertedFiles.length}`)
console.log(
  `\nNote: Converted require() to await import() for TypeScript source compatibility.`,
)
