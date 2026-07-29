/**
 * @file The four provenance records of a ported npm conformance suite, as pure
 *   readers. A ported suite's truth lives in a lockstep `file-fork` row; this
 *   module turns the other three records — the `.gitmodules` pin, the suite's
 *   prose `@file` header, and the upstream's release tag list — into comparable
 *   values. No IO, so every reader unit-tests directly.
 *   Doctrine: docs/agents.md/repo/npm-port-provenance.md.
 */

import path from 'node:path'

import { parseGitmodules } from '../../../fleet/_shared/gitmodules.mts'
import { parseBlocks } from '../../../fleet/gen/gitmodules-hash.mts'

import type { GitmodulesEntry } from '../../../fleet/_shared/gitmodules.mts'
import type {
  FileForkRow,
  LockstepManifest,
  Row,
  Upstream,
} from '../../../fleet/lockstep/schema.mts'

// Ported suites live here; a row's `local` path must start with this prefix for
// the row to be an npm port rather than some other file fork.
const NPM_PORT_LOCAL_PREFIX = 'test/npm/'

// A release tag carries a `<major>.<minor>` version token, optionally `v`
// prefixed and optionally with a patch — the same shape
// upstream-submodules-are-release-tagged accepts.
// oxlint-disable-next-line socket/require-regex-comment -- documented above
const RELEASE_TAG_RE = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/

// The `Ported 1:1 from upstream v<version> (<short-or-full-sha>)` clause of a
// ported suite's `@file` header, read off the comment collapsed to one line.
// oxlint-disable-next-line socket/require-regex-comment -- documented above
const HEADER_VERSION_RE =
  /ported\s+1:1\s+from\s+upstream\s+v?([0-9][\w.+-]*)\s*\(([0-9a-f]{7,40})\)/i

// The GitHub permalink that closes the header: owner, repo, the 40-hex object
// the port was taken at, and the upstream-relative path of the ported file.
// oxlint-disable-next-line socket/require-regex-comment -- documented above
const HEADER_PERMALINK_RE =
  /https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/blob\/([0-9a-f]{40})\/(\S+)/

// A `<owner>/<repo>` pair at the tail of an upstream repo URL, with an optional
// `.git` suffix.
// oxlint-disable-next-line socket/require-regex-comment -- documented above
const REPO_URL_SLUG_RE = /github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/

// A `refs/tags/<name>` line of `git ls-remote --tags` output, with the peeled
// `^{}` suffix dropped.
// oxlint-disable-next-line socket/require-regex-comment -- documented above
const LS_REMOTE_TAG_RE = /refs\/tags\/(\S+?)(?:\^\{\})?$/

export interface NpmPortHeader {
  // The upstream release version the header names, without the `v` prefix.
  version: string
  // The short-or-full object id in parentheses after the version.
  inlineSha: string
  // Permalink owner segment.
  owner: string
  // Permalink repo segment.
  repo: string
  // Permalink 40-hex object id.
  permalinkSha: string
  // Permalink path, relative to the upstream repo root.
  upstreamPath: string
}

export interface NpmPortPin extends GitmodulesEntry {
  // The `ref = <sha>` pinned object id, else undefined. `parseGitmodules` reads
  // the shape fields and `parseBlocks` reads the ref; merging them here keeps
  // both canonical parsers in use instead of forking a third.
  ref: string | undefined
}

export interface NpmPortProblem {
  // The lockstep row id the problem belongs to.
  id: string
  // What invariant broke.
  what: string
  // The file(s) the operator opens.
  where: string
  // The value found.
  saw: string
  // The value required.
  wanted: string
  // The command or edit that resolves it.
  fix: string
}

export interface NpmPortCheckInput {
  // `file-fork` rows whose `local` is a ported npm suite.
  rows: readonly FileForkRow[]
  // The manifest's merged `upstreams` map.
  upstreams: Readonly<Record<string, Upstream>>
  // Parsed `.gitmodules` blocks, each carrying its pinned ref.
  pins: readonly NpmPortPin[]
  // Ported-suite source text by repo-relative path; undefined when absent.
  readPortSource: (localPath: string) => string | undefined
  // `test/npm/package.json` devDependencies.
  devDependencies: Readonly<Record<string, string>>
  // True when `packages/npm/<pkg>` exists.
  hasOverridePackage: (packageName: string) => boolean
}

export interface ReleaseCurrency {
  // The newest release tag the upstream publishes, or undefined when it
  // publishes none.
  newest: string | undefined
  // Releases published after the pinned tag; -1 when the pinned tag is not in
  // the upstream's release list at all.
  behind: number
}

/**
 * The `@file` provenance header of a ported npm suite, or undefined when the
 * file does not carry one in the ported shape. Pure.
 */
export function parseNpmPortHeader(source: string): NpmPortHeader | undefined {
  const close = source.indexOf('*/')
  if (close === -1) {
    return undefined
  }
  // Collapse the block comment's `*` gutter and wrapping into one line so a
  // header split across lines matches the same regexes as an unwrapped one.
  const flat = source
    .slice(0, close)
    .replace(/^\s*\/?\*+/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const version = HEADER_VERSION_RE.exec(flat)
  const permalink = HEADER_PERMALINK_RE.exec(flat)
  if (!version || !permalink) {
    return undefined
  }
  return {
    version: version[1]!,
    inlineSha: version[2]!,
    owner: permalink[1]!,
    repo: permalink[2]!,
    permalinkSha: permalink[3]!,
    // The header sentence ends in a period directly after the URL; that is
    // punctuation, not part of the upstream path.
    upstreamPath: permalink[4]!.replace(/\.$/, ''),
  }
}

/**
 * The `file-fork` rows that record a ported npm conformance suite. Pure.
 */
export function collectNpmPortRows(
  manifest: Pick<LockstepManifest, 'rows'>,
): FileForkRow[] {
  const rows = (manifest.rows ?? []) as readonly Row[]
  const out: FileForkRow[] = []
  for (let i = 0, { length } = rows; i < length; i += 1) {
    const row = rows[i]!
    if (
      row.kind === 'file-fork' &&
      row.local.startsWith(NPM_PORT_LOCAL_PREFIX)
    ) {
      out.push(row)
    }
  }
  return out
}

/**
 * Every `.gitmodules` block with both its shape fields and its pinned ref.
 * `parseGitmodules` owns the shape fields and `parseBlocks` owns the ref, so
 * this merges the two canonical parsers rather than forking a third. Pure.
 */
export function mergeGitmodulesPins(gitmodulesText: string): NpmPortPin[] {
  const refByName = new Map(
    parseBlocks(gitmodulesText.split(/\r?\n/)).map(block => [
      block.name,
      block.ref,
    ]),
  )
  return parseGitmodules(gitmodulesText).map(entry => ({
    ...entry,
    ref: refByName.get(entry.name),
  }))
}

/**
 * The npm package name a ported suite covers, derived from its `local` path.
 * Pure.
 */
export function npmPortPackageName(localPath: string): string {
  return path.basename(localPath).replace(/\.test\.mts$/, '')
}

/**
 * The `<owner>/<repo>` slug of an upstream repo URL, or undefined when the URL
 * is not a GitHub remote. Pure.
 */
export function upstreamRepoSlug(repoUrl: string): string | undefined {
  const m = REPO_URL_SLUG_RE.exec(repoUrl)
  return m ? `${m[1]!}/${m[2]!}` : undefined
}

/**
 * A release tag with its `v` prefix removed. Pure.
 */
export function normalizeVersionTag(tag: string): string {
  return tag.startsWith('v') ? tag.slice(1) : tag
}

/**
 * A release tag's `[major, minor, patch]` triple, or undefined when the tag is
 * not a plain release tag (a prerelease, a moving branch, a date stamp). Pure.
 */
export function releaseTagVersion(
  tag: string,
): [number, number, number] | undefined {
  const m = RELEASE_TAG_RE.exec(tag)
  return m
    ? [Number(m[1]), Number(m[2]), m[3] === undefined ? 0 : Number(m[3])]
    : undefined
}

/**
 * Release tags sorted oldest to newest, prereleases and non-release refs
 * dropped. Pure.
 */
export function sortReleaseTags(tags: readonly string[]): string[] {
  return tags
    .filter(tag => releaseTagVersion(tag) !== undefined)
    .toSorted((a, b) => {
      const left = releaseTagVersion(a)!
      const right = releaseTagVersion(b)!
      for (let i = 0; i < 3; i += 1) {
        if (left[i] !== right[i]) {
          return left[i]! - right[i]!
        }
      }
      return a.localeCompare(b)
    })
}

/**
 * The tag names in `git ls-remote --tags` output, deduplicated, with the peeled
 * `^{}` refs collapsed onto their tag name. Pure.
 */
export function parseLsRemoteTags(lsRemoteOutput: string): string[] {
  const seen = new Set<string>()
  const lines = lsRemoteOutput.split('\n')
  for (let i = 0, { length } = lines; i < length; i += 1) {
    const m = LS_REMOTE_TAG_RE.exec(lines[i]!.trim())
    if (m) {
      seen.add(m[1]!)
    }
  }
  return [...seen]
}

/**
 * How far a pinned tag trails the upstream's newest release. Pure.
 */
export function measureReleaseCurrency(
  pinnedTag: string,
  tags: readonly string[],
): ReleaseCurrency {
  const sorted = sortReleaseTags(tags)
  const newest = sorted.length ? sorted[sorted.length - 1] : undefined
  const index = sorted.indexOf(pinnedTag)
  return { newest, behind: index === -1 ? -1 : sorted.length - 1 - index }
}

/**
 * Render one problem as the fleet's What / Where / Saw vs wanted / Fix block.
 * Pure.
 */
export function formatNpmPortProblem(problem: NpmPortProblem): string {
  return [
    `  ${problem.id}`,
    `    What:   ${problem.what}`,
    `    Where:  ${problem.where}`,
    `    Saw:    ${problem.saw}`,
    `    Wanted: ${problem.wanted}`,
    `    Fix:    ${problem.fix}`,
  ].join('\n')
}
