import { readFileSync } from 'node:fs'
import path from 'node:path'

import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

import type { Static } from '@sinclair/typebox'

const UpstreamSchema = Type.Object({
  repo: Type.String({ minLength: 1 }),
  submodule: Type.String({ minLength: 1 }),
})

const ManifestSchema = Type.Object({
  includes: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  rows: Type.Array(Type.Object({ kind: Type.String({ minLength: 1 }) })),
  upstreams: Type.Optional(Type.Record(Type.String(), UpstreamSchema)),
})

const FileForkSchema = Type.Object({
  deviations: Type.Array(Type.String(), { minItems: 1 }),
  forked_at_sha: Type.String({ pattern: '^[0-9a-f]{40}$' }),
  id: Type.String({ minLength: 1 }),
  kind: Type.Literal('file-fork'),
  local: Type.String({ minLength: 1 }),
  upstream: Type.String({ minLength: 1 }),
  upstream_path: Type.String({ minLength: 1 }),
})

export type FileForkRow = Static<typeof FileForkSchema>
export type LockstepManifest = Static<typeof ManifestSchema>
export type Upstream = Static<typeof UpstreamSchema>

function readManifest(manifestPath: string): LockstepManifest {
  const value: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!Value.Check(ManifestSchema, value)) {
    throw new Error(`Invalid port provenance manifest at ${manifestPath}`)
  }
  for (const row of value.rows) {
    if (row.kind === 'file-fork' && !Value.Check(FileForkSchema, row)) {
      throw new Error(`Invalid file-fork row in ${manifestPath}`)
    }
  }
  return value
}

export function loadPortManifest(manifestPath: string): LockstepManifest {
  const root = readManifest(manifestPath)
  const directory = path.dirname(manifestPath)
  const includes = (root.includes ?? []).map(file =>
    readManifest(path.resolve(directory, file)),
  )
  return {
    rows: [root, ...includes].flatMap(manifest => manifest.rows),
    upstreams: Object.assign(
      Object.create(null) as Record<string, Upstream>,
      ...[...includes, root].map(manifest => manifest.upstreams),
    ),
  }
}

export function isFileForkRow(row: unknown): row is FileForkRow {
  return Value.Check(FileForkSchema, row)
}
