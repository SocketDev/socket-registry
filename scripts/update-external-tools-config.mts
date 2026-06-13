/**
 * @file Schema, types, and read/write I/O for the repo-root
 *   `external-tools.json` the updater maintains. Split out of
 *   update-external-tools.mts so the orchestrator and the one-shot migration
 *   share one source of truth for the config shape and stay under the file-size
 *   soft cap.
 */

import { promises as fs, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Type } from '@sinclair/typebox'
import type { Static } from '@sinclair/typebox'

import { parseSchema } from '@socketsecurity/lib-stable/schema/parse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

export const CONFIG_FILE = path.join(REPO_ROOT, 'external-tools.json')

// Schema matches the sibling security-tools hook style (typebox +
// parseSchema via @socketsecurity/lib-stable/schema/parse). Keep the two in
// sync — both consume `external-tools.json`-shaped data.
//
// Two tool shapes are supported:
//   1. Single-flavor (pnpm, zizmor): `{ repository, platforms, … }`
//      with platforms at the top level.
//   2. Multi-flavor (sfw): `{ free: { repository, binaryName, platforms },
//      enterprise: { ... } }` — flavors carry their own repository
//      and per-platform integrity values while sharing one `version`.
//
// The `integrity` field is Subresource Integrity (SRI): `sha256-<base64>`
// (or `sha384-` / `sha512-`). Same shape npm / pnpm / browser
// `<script integrity>` consume natively. Source-of-truth is the field
// itself; the outer `platforms` map name describes the keying.
const platformEntrySchema = Type.Object({
  asset: Type.String(),
  integrity: Type.String({ pattern: '^sha(256|384|512)-[A-Za-z0-9+/=]+$' }),
})

const platformsSchema = Type.Record(Type.String(), platformEntrySchema)

const flavorSchema = Type.Object({
  repository: Type.String(),
  binaryName: Type.String(),
  platforms: platformsSchema,
})

// `version` is optional at the schema level because some entries (e.g.
// `rust`) declare a `minVersion` floor instead of a pinned version — they
// resolve at install time via rustup / runner toolcache, not via downloads
// from a fixed GitHub release. updateTool() enforces `version` at runtime
// only for entries with `release: 'asset'`; floor-shape entries skip the
// update path entirely.
const toolSchema = Type.Object(
  {
    description: Type.Optional(Type.String()),
    repository: Type.Optional(Type.String()),
    version: Type.Optional(Type.String()),
    minVersion: Type.Optional(Type.String()),
    release: Type.Optional(Type.String()),
    platforms: Type.Optional(platformsSchema),
    free: Type.Optional(flavorSchema),
    enterprise: Type.Optional(flavorSchema),
    // Dated, self-expiring soak bypass for ONE specific version. When the
    // latest release equals `version` and today is on/before `removable`, the
    // bumper accepts it despite being inside the minimumReleaseAge window —
    // for releases from a known publisher (GitHub-asset distributions) where
    // the soak (aimed at npm typosquats / malicious freshpubs) is lower-value.
    // `removable` (published + soak window) auto-disarms the bypass, so a stale
    // entry can't grant a permanent waiver. Mirrors pnpm-workspace.yaml's
    // `# published: <d> | removable: <d>` minimumReleaseAgeExclude annotations.
    soakBypass: Type.Optional(
      Type.Object({
        version: Type.String(),
        published: Type.String(),
        removable: Type.String(),
      }),
    ),
    notes: Type.Optional(
      Type.Union([Type.String(), Type.Array(Type.String())]),
    ),
    // Catch-all so floor-shape entries (rust: minLlvmVersion, components,
    // …) don't trip schema validation. Stricter per-tool typing belongs in
    // the entry's own validator, not this aggregate schema.
  },
  { additionalProperties: true },
)

const rootConfigSchema = Type.Record(Type.String(), toolSchema)

export type PlatformEntry = Static<typeof platformEntrySchema>
export type RootConfig = Static<typeof rootConfigSchema>

export interface UpdateResult {
  tool: string
  skipped: boolean
  updated: boolean
  reason: string
}

export function ownerAndNameFromRepository(
  repository: string | undefined,
): string {
  if (!repository) {
    throw new Error('Missing `repository` field on tool entry')
  }
  // Accept either "github:owner/name" or "owner/name".
  const idx = repository.indexOf(':')
  return idx === -1 ? repository : repository.slice(idx + 1)
}

export function readConfig(): RootConfig {
  const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
  return parseSchema(rootConfigSchema, raw)
}

export async function writeConfig(config: RootConfig): Promise<void> {
  await fs.writeFile(
    CONFIG_FILE,
    JSON.stringify(config, undefined, 2) + '\n',
    'utf8',
  )
}
