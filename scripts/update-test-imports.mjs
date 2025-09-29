/**
 * @fileoverview Updates test files to use relative imports instead of package imports.
 * This simplifies coverage configuration by allowing Vitest aliases to work properly.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import fastGlob from 'fast-glob'

async function updateTestImports() {
  const testFiles = await fastGlob.glob('test/registry/*.test.mts', {
    cwd: process.cwd(),
    absolute: true,
  })

  console.log(`Found ${testFiles.length} test files to update`)

  for (const filePath of testFiles) {
    // eslint-disable-next-line no-await-in-loop
    const content = await readFile(filePath, 'utf-8')

    // Replace require('@socketsecurity/registry/lib/...') with require('../../registry/dist/lib/...')
    const updatedContent = content.replace(
      /require\('@socketsecurity\/registry\/lib\/([^']*)'\)/g,
      "require('../../registry/dist/lib/$1')",
    )

    if (content !== updatedContent) {
      // eslint-disable-next-line no-await-in-loop
      await writeFile(filePath, updatedContent)
      console.log(`Updated: ${path.relative(process.cwd(), filePath)}`)
    }
  }

  console.log('Test import updates complete!')
}

updateTestImports().catch(error => {
  console.error('Error updating test imports:', error)
  throw error
})
