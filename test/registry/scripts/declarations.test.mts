import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { expect, it } from 'vitest'

import {
  normalizeRegistryDeclarations,
  rewriteDeclarationSpecifiers,
} from '../../../registry/scripts/declarations.mts'
import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'

it('rewrites relative module references without changing literal types or external modules', () => {
  const source = `import type { Manifest } from './types.mjs'
export { Manifest } from "../types.mjs"
export * from './other.mjs'
export type Nested = import('./nested.mjs').Nested
export type Literal = './types.mjs'
export type External = import('example-package/types.mjs').External
// export * from './comment.mjs'
`
  expect(rewriteDeclarationSpecifiers(source))
    .toBe(`import type { Manifest } from './types.js'
export { Manifest } from "../types.js"
export * from './other.js'
export type Nested = import('./nested.js').Nested
export type Literal = './types.mjs'
export type External = import('example-package/types.mjs').External
// export * from './comment.mjs'
`)
})

it('preserves published declaration filenames and leaves JavaScript artifacts intact', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'registry-declarations-'),
  )
  try {
    await writeFile(
      path.join(directory, 'index.d.mts'),
      "export * from './types.mjs'\n",
    )
    await writeFile(
      path.join(directory, 'types.d.mts'),
      "export type Literal = './types.mjs'\n",
    )
    await writeFile(
      path.join(directory, 'index.js'),
      'exports.example = true\n',
    )
    await normalizeRegistryDeclarations(directory)
    expect((await readdir(directory)).toSorted()).toEqual([
      'index.d.ts',
      'index.js',
      'types.d.ts',
    ])
    expect(await readFile(path.join(directory, 'index.d.ts'), 'utf8')).toBe(
      "export * from './types.js'\n",
    )
    expect(await readFile(path.join(directory, 'types.d.ts'), 'utf8')).toBe(
      "export type Literal = './types.mjs'\n",
    )
    expect(await readFile(path.join(directory, 'index.js'), 'utf8')).toBe(
      'exports.example = true\n',
    )
  } finally {
    await safeDelete(directory)
  }
})
