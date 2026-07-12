/**
 * @file Shared coverage-badge logic for make-coverage-badge.mts (writes the
 *   badge SVG + README reference from a coverage run) and
 *   check/coverage-badge-is-current.mts (asserts the badge matches actual
 *   coverage). The badge is a repo-local optimized SVG asset — no third-party
 *   badge host — generated at `assets/repo/badges/coverage.svg` and referenced
 *   by the README as `![Coverage](assets/repo/badges/coverage.svg)`. One place
 *   owns the SVG renderer, the color buckets, the README regexes, and the
 *   coverage-total read, so the writer and the checker can never disagree on
 *   what "current" means. READMEs that still carry the retired shields.io badge
 *   form — or the legacy pre-badges/ asset path — are recognized for migration:
 *   `migrateReadmeBadge` rewrites that line to the current reference.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Where the generated badge lives, relative to the repo root. `assets/repo/`
// is the repo-owned asset tier (never cascade-synced), so each repo's percent
// is its own. Seeded as a preset placeholder ("n/a", grey) so a fresh README
// never references a missing image.
export const BADGE_ASSET_PATH = 'assets/repo/badges/coverage.svg'

// The canonical README reference to the badge asset.
export const BADGE_MARKDOWN = `![Coverage](${BADGE_ASSET_PATH})`

// The value text a seeded-but-never-measured badge carries. The check treats
// an "n/a" badge as "not yet measured" (fail-open), never a mismatch.
export const BADGE_PLACEHOLDER = 'n/a'

// The local-asset README reference (the current form).
const ASSET_BADGE_RE = /!\[Coverage\]\(assets\/repo\/badges\/coverage\.svg\)/ // socket-lint: allow uncommented-regex

// The legacy pre-badges/ asset path, matched only to migrate it.
const LEGACY_ASSET_BADGE_RE = /!\[Coverage\]\(assets\/repo\/coverage\.svg\)/ // socket-lint: allow uncommented-regex

// The retired third-party badge form, matched only to migrate it:
//   ![Coverage](https://img.shields.io/badge/coverage-<PCT|NN>%25-<color>)
const SHIELDS_BADGE_RE =
  /!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-(?:<PCT>|\d+)%25-[a-z]+\)/ // socket-lint: allow uncommented-regex

// The `aria-label="coverage: <value>"` the renderer stamps on the SVG — the
// machine-readable percent the check reads back.
const SVG_LABEL_RE = /aria-label="coverage: (\d+%|n\/a)"/ // socket-lint: allow uncommented-regex

export type BadgeForm = 'asset' | 'legacy-asset' | 'shields'

// Which badge form the README carries: 'asset' (current), 'legacy-asset'
// (pre-badges/ path, needs migration), 'shields' (retired, needs migration),
// or undefined (a repo that opted out of the badge).
export function readmeBadgeForm(readme: string): BadgeForm | undefined {
  if (ASSET_BADGE_RE.test(readme)) {
    return 'asset'
  }
  if (LEGACY_ASSET_BADGE_RE.test(readme)) {
    return 'legacy-asset'
  }
  if (SHIELDS_BADGE_RE.test(readme)) {
    return 'shields'
  }
  return undefined
}

// Rewrite a retired badge line (shields.io or the legacy pre-badges/ asset
// path) to the current reference. Already-migrated or badge-less READMEs
// come back unchanged.
export function migrateReadmeBadge(readme: string): string {
  return readme
    .replace(SHIELDS_BADGE_RE, BADGE_MARKDOWN)
    .replace(LEGACY_ASSET_BADGE_RE, BADGE_MARKDOWN)
}

// Fill color for a coverage percent — the conventional coverage gradient so
// the badge reads at a glance (brightgreen ≥90, green ≥80, yellowgreen ≥70,
// yellow ≥60, orange ≥50, red below).
export function badgeColor(pct: number): string {
  if (pct >= 90) {
    return '#4c1'
  }
  if (pct >= 80) {
    return '#97ca00'
  }
  if (pct >= 70) {
    return '#a4a61d'
  }
  if (pct >= 60) {
    return '#dfb317'
  }
  if (pct >= 50) {
    return '#fe7d37'
  }
  return '#e05d44'
}

// Approximate rendered width of a badge string in Verdana 11px. Exactness is
// not required: every <text> carries textLength, which forces the glyph run to
// the computed width, so a near-miss stretches invisibly instead of clipping.
function textWidth(text: string): number {
  let w = 0
  for (let i = 0, { length } = text; i < length; i += 1) {
    const c = text[i]!
    if (c >= '0' && c <= '9') {
      w += 7
    } else if (c === '%') {
      w += 11
    } else if (c === '/') {
      w += 5
    } else {
      w += 6.5
    }
  }
  return Math.round(w)
}

const LABEL = 'coverage'
// 10px of horizontal padding per segment (5px each side).
const PAD = 10

/**
 * Render a label/value badge SVG with a flat two-segment layout (grey label,
 * colored value). Pure, deterministic, and emitted pre-optimized:
 * integer/precision-2 numbers, no comments or metadata, no collapsible
 * whitespace — a fixpoint of the repo's svgo pass (the wheelhouse
 * coverage-badge-optimized test asserts this). Text uses the font-size-110 +
 * scale(.1) idiom with textLength so metrics are deterministic across
 * renderers. The generic core behind the coverage badge; repo scripts reuse it
 * for any other local badge so no README ever points at a third-party badge
 * host.
 */
export function renderBadge(
  badgeLabel: string,
  text: string,
  color: string,
): string {
  const lw = textWidth(badgeLabel) + PAD
  const vw = textWidth(text) + PAD
  const w = lw + vw
  const lcx = lw * 5
  const vcx = (lw + vw / 2) * 10
  const ltl = (lw - PAD) * 10
  const vtl = (vw - PAD) * 10
  const label = `${badgeLabel}: ${text}`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${label}">` +
    `<title>${label}</title>` +
    `<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>` +
    `<clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>` +
    `<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><rect width="${w}" height="20" fill="url(#s)"/></g>` +
    `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">` +
    `<text aria-hidden="true" x="${lcx}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${ltl}">${badgeLabel}</text>` +
    `<text x="${lcx}" y="140" transform="scale(.1)" textLength="${ltl}">${badgeLabel}</text>` +
    `<text aria-hidden="true" x="${vcx}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${vtl}">${text}</text>` +
    `<text x="${vcx}" y="140" transform="scale(.1)" textLength="${vtl}">${text}</text>` +
    `</g></svg>\n`
  )
}

// The coverage badge for a value text + fill color.
export function renderCoverageBadge(text: string, color: string): string {
  return renderBadge(LABEL, text, color)
}

// The badge SVG for a coverage percent — rounded integer + bucket color — or
// the grey "n/a" placeholder when the repo has never measured coverage.
export function coverageBadgeSvg(pct: number | undefined): string {
  if (pct === undefined) {
    return renderCoverageBadge(BADGE_PLACEHOLDER, '#9f9f9f')
  }
  return renderCoverageBadge(`${Math.round(pct)}%`, badgeColor(pct))
}

// The value text stamped in a generated badge SVG ("87%" or "n/a"), or
// undefined when the file is not a generated coverage badge.
export function parseBadgeSvgValue(svg: string): string | undefined {
  const m = SVG_LABEL_RE.exec(svg)
  return m ? m[1]! : undefined
}

// Absolute path of the badge asset for a repo.
export function badgeAssetPath(repoRoot: string): string {
  return path.join(repoRoot, 'assets', 'repo', 'badges', 'coverage.svg')
}

// The line-coverage total percent from a vitest `coverage/coverage-summary.json`
// (the `json-summary` reporter). Returns undefined when the file is absent or
// shapeless — the caller decides whether that's fail-open (the check) or an
// error (the writer, which needs a real number).
export function readCoveragePct(repoRoot: string): number | undefined {
  const summaryPath = path.join(repoRoot, 'coverage', 'coverage-summary.json')
  if (!existsSync(summaryPath)) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(summaryPath, 'utf8'))
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined
  }
  const total = (parsed as Record<string, unknown>)['total']
  if (typeof total !== 'object' || total === null) {
    return undefined
  }
  const lines = (total as Record<string, unknown>)['lines']
  if (typeof lines !== 'object' || lines === null) {
    return undefined
  }
  const pct = (lines as Record<string, unknown>)['pct']
  return typeof pct === 'number' ? pct : undefined
}

// The coverage script names a fleet repo may declare, in preference order. The
// first one present in package.json `scripts` is the repo's coverage entry.
const COVERAGE_SCRIPT_NAMES = ['cover', 'coverage', 'test:cover'] as const

// The name of the repo's coverage script (the first of `cover` / `coverage` /
// `test:cover` declared in package.json), or undefined when the repo tracks no
// coverage. One owner for "does this repo track coverage, and under what
// script name" — the updating-coverage skill and any check call this instead of
// re-deriving it with a `node -e` snippet.
export function coverageScriptName(repoRoot: string): string | undefined {
  const pkgPath = path.join(repoRoot, 'package.json')
  if (!existsSync(pkgPath)) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined
  }
  const scripts = (parsed as Record<string, unknown>)['scripts']
  if (typeof scripts !== 'object' || scripts === null) {
    return undefined
  }
  for (let i = 0, { length } = COVERAGE_SCRIPT_NAMES; i < length; i += 1) {
    const name = COVERAGE_SCRIPT_NAMES[i]!
    if (typeof (scripts as Record<string, unknown>)[name] === 'string') {
      return name
    }
  }
  return undefined
}
