/**
 * @fileoverview Post-build transform for Node ESM interop.
 * Converts esbuild's __toCommonJS wrapper to clear module.exports literal.
 * Node ESM requires: module.exports = { foo, bar } for named imports.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')
const indexPath = path.join(rootPath, 'dist', 'index.js')

try {
  const content = readFileSync(indexPath, 'utf8')

  // Extract the annotation (dead code) that shows the correct exports
  // Pattern: 0 && (module.exports = { ... });
  const annotationMatch = content.match(
    /\/\/ Annotate[^\n]*\n0 && \(module\.exports = \{([^}]+)\}\);/s,
  )

  if (!annotationMatch) {
    console.error('Could not find export annotation in built file')
    process.exit(1)
  }

  // Step 1: Remove the early module.exports = __toCommonJS(...) line
  let transformedContent = content.replace(
    /module\.exports = __toCommonJS\([^)]+\);\n/,
    '',
  )

  // Step 2: Replace the dead code annotation with actual export at the end
  transformedContent = transformedContent.replace(
    /\/\/ Annotate the CommonJS export names for ESM import in node:\n0 && \(module\.exports = \{[^}]+\}\);/,
    `// CommonJS exports for Node ESM interop\nmodule.exports = {${annotationMatch[1]}};`,
  )

  // Write back the transformed content
  writeFileSync(indexPath, transformedContent, 'utf8')

  console.log('✓ Transformed exports for Node ESM interop')
} catch (error) {
  console.error('Post-build transform failed:', error.message)
  process.exit(1)
}
