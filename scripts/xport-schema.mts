/**
 * @fileoverview zod schema for xport.json — single source of truth.
 *
 * Everything else is derived:
 *   - TypeScript types in scripts/xport.mts via `z.infer<typeof ...>`
 *   - xport.schema.json (draft 2020-12) via `z.toJSONSchema()`, emitted by
 *     scripts/xport-emit-schema.mts
 *   - Runtime validation at harness startup via `XportManifestSchema.parse()`
 *
 * Byte-identical across socket-tui / socket-btm / socket-sdxgen / ultrathink /
 * socket-registry / socket-repo-template via sync-scaffolding.mjs.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared primitives.
// ---------------------------------------------------------------------------

const IdSchema = z
  .string()
  .regex(/^[a-z0-9][A-Za-z0-9-]*$/)
  .describe(
    'Stable identifier, unique within the manifest. Starts with lowercase letter or digit; remaining characters are letters/digits/hyphens. Kebab-case preferred, but camelCase segments are allowed (e.g. `export-findNodeAt` when the id mirrors an API name).',
  )

const CriticalitySchema = z
  .number()
  .int()
  .min(1)
  .max(10)
  .describe(
    'Stay-in-step importance (1 = cosmetic, 10 = security-sensitive). Harness surfaces high-criticality drift louder.',
  )

const UpstreamRefSchema = z
  .string()
  .describe('Key into the top-level `upstreams` map.')

const ConformanceTestSchema = z
  .string()
  .describe(
    "Path to a test that enforces behavior parity (modulo documented deviations). Strongly recommended — static checks can't catch silent behavioral drift.",
  )

const NotesSchema = z
  .string()
  .describe(
    'Free-form context — why this row exists, what gotchas to watch for.',
  )

const ShaSchema = z
  .string()
  .regex(/^[0-9a-f]{40}$/)
  .describe('Full 40-char git SHA.')

const PortStatusSchema = z
  .object({
    status: z.enum(['implemented', 'opt-out']),
    reason: z
      .string()
      .optional()
      .describe('Required when status is `opt-out`. Explain why.'),
    path: z
      .string()
      .optional()
      .describe(
        "Optional path to the port's implementation of this row. Useful for module-inventory rows where each language points at a different directory.",
      ),
    note: z
      .string()
      .optional()
      .describe(
        "Optional free-form note attached to a specific port's status.",
      ),
  })
  .strict()
  .describe(
    'Per-port status for a lang-parity row. `implemented` = port meets assertions; `opt-out` = port consciously skips, requires non-empty `reason`.',
  )

const UpstreamSchema = z
  .object({
    submodule: z.string().describe('Submodule path, relative to repo root.'),
    repo: z.string().url(),
  })
  .strict()

const SiteSchema = z
  .object({
    path: z
      .string()
      .describe("Path to the port's root directory, relative to repo root."),
    language: z
      .string()
      .optional()
      .describe('Language label, for human reports.'),
  })
  .strict()

const FixtureCheckSchema = z
  .object({
    fixture_path: z.string(),
    snapshot_path: z.string().optional(),
    diff_tolerance: z.enum(['exact', 'line-by-line', 'semantic']).optional(),
  })
  .strict()
  .describe(
    "Golden-input verification. Prefer snapshot-based diffs over hardcoded counts (brittleness lesson from sdxgen's lock-step-features).",
  )

// ---------------------------------------------------------------------------
// Row kinds.
// ---------------------------------------------------------------------------

const FileForkRowSchema = z
  .object({
    kind: z.literal('file-fork'),
    id: IdSchema,
    upstream: UpstreamRefSchema,
    criticality: CriticalitySchema.optional(),
    conformance_test: ConformanceTestSchema.optional(),
    notes: NotesSchema.optional(),
    local: z
      .string()
      .describe('Path to our ported file, relative to repo root.'),
    upstream_path: z
      .string()
      .describe('Path to the source file within the upstream submodule.'),
    forked_at_sha: ShaSchema.describe(
      'Full 40-char SHA of the upstream commit we forked from. Harness runs `git log <sha>..HEAD -- <upstream_path>` to surface drift.',
    ),
    deviations: z
      .array(z.string())
      .min(1)
      .describe(
        "Human-readable list of intentional differences. Zero deviations = use upstream directly; don't fork.",
      ),
  })
  .strict()
  .describe(
    'A local file derived from an upstream file with intentional modifications. Drift = upstream moved forward without us.',
  )

const VersionPinRowSchema = z
  .object({
    kind: z.literal('version-pin'),
    id: IdSchema,
    upstream: UpstreamRefSchema,
    criticality: CriticalitySchema.optional(),
    conformance_test: ConformanceTestSchema.optional(),
    notes: NotesSchema.optional(),
    pinned_sha: ShaSchema.describe(
      'Full 40-char SHA the submodule is pinned to.',
    ),
    pinned_tag: z
      .string()
      .optional()
      .describe(
        'Human-readable release tag (e.g., `v3.2.1`). Optional — the SHA is authoritative.',
      ),
    upgrade_policy: z
      .enum(['track-latest', 'major-gate', 'locked'])
      .describe(
        'track-latest: any new release is actionable; major-gate: only major bumps require review; locked: explicit decision per upgrade.',
      ),
  })
  .strict()
  .describe(
    "A submodule pinned to an upstream release. Drift = upstream cut a new release we haven't adopted.",
  )

const FeatureParityRowSchema = z
  .object({
    kind: z.literal('feature-parity'),
    id: IdSchema,
    upstream: UpstreamRefSchema,
    criticality: CriticalitySchema,
    conformance_test: ConformanceTestSchema.optional(),
    notes: NotesSchema.optional(),
    local_area: z
      .string()
      .describe(
        'Path to the local module/directory implementing the feature. Code pattern scan targets this directory (excluding test files).',
      ),
    test_area: z
      .string()
      .optional()
      .describe(
        'Optional path to the directory where tests for this feature live. When absent, the harness searches inside `local_area`.',
      ),
    code_patterns: z
      .array(z.string())
      .optional()
      .describe(
        'Regex patterns the local implementation must contain. Prefer anchored patterns (function signatures) over loose keywords to avoid comment false positives.',
      ),
    test_patterns: z
      .array(z.string())
      .optional()
      .describe('Regex patterns the test suite must contain.'),
    fixture_check: FixtureCheckSchema.optional(),
  })
  .strict()
  .describe(
    'A behavioral feature reimplemented locally to match upstream behavior. Three-pillar validation: code patterns, test patterns, fixture snapshots.',
  )

const SpecConformanceRowSchema = z
  .object({
    kind: z.literal('spec-conformance'),
    id: IdSchema,
    upstream: UpstreamRefSchema,
    criticality: CriticalitySchema.optional(),
    conformance_test: ConformanceTestSchema.optional(),
    notes: NotesSchema.optional(),
    local_impl: z.string(),
    spec_version: z.string(),
    spec_path: z
      .string()
      .optional()
      .describe(
        'Path within the upstream submodule to the spec document, if applicable.',
      ),
  })
  .strict()
  .describe(
    'A local reimplementation of an external specification. Drift = the spec was revised.',
  )

// Assertions are deliberately untyped — each matrix area defines its own
// assertion shapes. The harness ignores fields it doesn't recognize.
// Historical precedent: ultrathink's xlang-harness.mts treats this as
// `unknown[]`.
const AssertionSchema = z.record(z.string(), z.unknown())

const LangParityRowSchema = z
  .object({
    kind: z.literal('lang-parity'),
    id: IdSchema,
    name: z.string(),
    description: z.string(),
    category: z
      .string()
      .describe(
        'Grouping tag. `rejected` is reserved for anti-patterns (every port must be opt-out; reintroduction exits 2).',
      ),
    criticality: CriticalitySchema.optional(),
    conformance_test: ConformanceTestSchema.optional(),
    notes: NotesSchema.optional(),
    assertions: z
      .array(AssertionSchema)
      .optional()
      .describe(
        'Open-ended assertion list. Each has a `kind` string the harness dispatches on. Unknown kinds are skipped with a log line.',
      ),
    matrix_files: z
      .array(z.string())
      .optional()
      .describe(
        'For inventory rows that index other xport-lang-*.json files. Paths relative to this manifest.',
      ),
    ports: z
      .record(z.string(), PortStatusSchema)
      .describe('Per-site status. Keys must match top-level `sites`.'),
  })
  .strict()
  .describe(
    'N sibling language ports of one spec within a single project. Drift = one port diverged from its siblings.',
  )

export const RowSchema = z.discriminatedUnion('kind', [
  FileForkRowSchema,
  VersionPinRowSchema,
  FeatureParityRowSchema,
  SpecConformanceRowSchema,
  LangParityRowSchema,
])

// ---------------------------------------------------------------------------
// Top-level manifest.
// ---------------------------------------------------------------------------

export const XportManifestSchema = z
  .object({
    $schema: z.string().optional(),
    description: z.string().optional(),
    area: z
      .string()
      .optional()
      .describe(
        "Optional label for this manifest file. Used as a grouping key in harness output. Defaults to 'root' for the top-level file and to the filename stem for included files.",
      ),
    includes: z
      .array(z.string())
      .optional()
      .describe(
        'Relative paths to sub-manifests. Top-level `upstreams` and `sites` maps override any same-keyed entries in included manifests.',
      ),
    upstreams: z
      .record(z.string(), UpstreamSchema)
      .optional()
      .describe(
        'Named upstream submodules. Referenced by rows[].upstream on file-fork, version-pin, feature-parity, spec-conformance rows. Omit when the manifest only has lang-parity rows.',
      ),
    sites: z
      .record(z.string(), SiteSchema)
      .optional()
      .describe(
        'Named sibling ports (typically per-language). Referenced by rows[].ports.<site> on lang-parity rows. Omit when the manifest has no lang-parity rows.',
      ),
    rows: z.array(RowSchema),
  })
  .describe(
    'Unified lock-step manifest shared across Socket repos. One schema, all cases — `kind` discriminator on each row selects which flavor of lock-step applies.',
  )

export type Row = z.infer<typeof RowSchema>
export type XportManifest = z.infer<typeof XportManifestSchema>
export type Upstream = z.infer<typeof UpstreamSchema>
export type Site = z.infer<typeof SiteSchema>
export type PortStatus = z.infer<typeof PortStatusSchema>
export type FileForkRow = z.infer<typeof FileForkRowSchema>
export type VersionPinRow = z.infer<typeof VersionPinRowSchema>
export type FeatureParityRow = z.infer<typeof FeatureParityRowSchema>
export type SpecConformanceRow = z.infer<typeof SpecConformanceRowSchema>
export type LangParityRow = z.infer<typeof LangParityRowSchema>
