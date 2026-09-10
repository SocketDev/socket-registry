import { readFile, rename, writeFile } from 'node:fs/promises'

import { parse } from '@babel/parser'
import { traverseFast } from '@babel/types'
import fg from 'fast-glob'

import type { StringLiteral } from '@babel/types'

export function rewriteDeclarationSpecifiers(source: string): string {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const specifiers: StringLiteral[] = []
  traverseFast(ast, node => {
    if (
      node.type === 'ExportAllDeclaration' ||
      node.type === 'ExportNamedDeclaration' ||
      node.type === 'ImportDeclaration'
    ) {
      if (node.source) {
        specifiers.push(node.source)
      }
    } else if (
      node.type === 'TSImportType' &&
      node.argument.type === 'StringLiteral'
    ) {
      specifiers.push(node.argument)
    }
  })
  const ordered = specifiers.toSorted(
    (left, right) => right.start! - left.start!,
  )
  for (let index = 0, { length } = ordered; index < length; index += 1) {
    const specifier = ordered[index]!
    if (
      /^\.{1,2}\//.test(specifier.value) &&
      specifier.value.endsWith('.mjs')
    ) {
      source =
        source.slice(0, specifier.end! - 4) +
        'js' +
        source.slice(specifier.end! - 1)
    }
  }
  return source
}

export async function normalizeRegistryDeclarations(
  distPath: string,
): Promise<void> {
  const files = await fg('**/*.d.mts', { cwd: distPath, absolute: true })
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    await writeFile(file, rewriteDeclarationSpecifiers(source))
    await rename(file, file.replace(/\.d\.mts$/, '.d.ts'))
  }
}
