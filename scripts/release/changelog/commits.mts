/**
 * @file Parse Conventional Commits and compute the next version from the
 *   commit set being released.
 */
import { parseVersion } from '@socketsecurity/lib-stable/versions/parse'
import { maxVersion } from '@socketsecurity/lib-stable/versions/range'

export const COMMIT_FIELD_SEP = '\x1f'
export const COMMIT_RECORD_SEP = '\x1e'
export const COMMIT_LOG_FORMAT = `%H${COMMIT_FIELD_SEP}%s${COMMIT_FIELD_SEP}%b${COMMIT_RECORD_SEP}`
export type BumpLevel = 'major' | 'minor' | 'patch'

export interface ConventionalCommit {
  breaking: boolean
  description: string
  hash: string
  scope: string | undefined
  type: string
}

const SUBJECT_RE =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?:\s*(?<description>.+)$/

export function parseChangelogCommit(
  hash: string,
  subject: string,
  body: string,
): ConventionalCommit | undefined {
  const m = SUBJECT_RE.exec(subject.trim())
  if (!m?.groups) {
    return undefined
  }
  const { bang, description, scope, type } = m.groups
  const breaking = bang === '!' || /^BREAKING CHANGE:/m.test(body)
  return {
    breaking,
    description: description!.trim(),
    hash,
    scope: scope ? scope.trim() : undefined,
    type: type!,
  }
}

export function parseChangelogCommits(raw: string): ConventionalCommit[] {
  const out: ConventionalCommit[] = []
  const records = raw.split(COMMIT_RECORD_SEP)
  for (let i = 0, { length } = records; i < length; i += 1) {
    const record = records[i]!.trim()
    if (!record) {
      continue
    }
    const { 0: hash, 1: subject, 2: body } = record.split(COMMIT_FIELD_SEP)
    const commit = parseChangelogCommit(hash ?? '', subject ?? '', body ?? '')
    if (commit) {
      out.push(commit)
    }
  }
  return out
}

export function changelogCommitBumpLevel(
  commits: readonly ConventionalCommit[],
): BumpLevel | undefined {
  let hasFeature = false
  let hasPatchable = false
  for (let i = 0, { length } = commits; i < length; i += 1) {
    const c = commits[i]!
    if (c.breaking) {
      return 'major'
    }
    if (c.type === 'feat') {
      hasFeature = true
    } else if (c.type === 'fix' || c.type === 'perf' || c.type === 'revert') {
      hasPatchable = true
    }
  }
  if (hasFeature) {
    return 'minor'
  }
  if (hasPatchable) {
    return 'patch'
  }
  return undefined
}

export function changelogVersionHint(current: string): string | undefined {
  const parsed = parseVersion(current)
  if (!parsed?.prerelease?.length) {
    return undefined
  }
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`
}

export function nextChangelogVersion(
  current: string,
  level: BumpLevel,
): string {
  const parsed = parseVersion(current)
  const major = parsed?.major ?? 0
  const minor = parsed?.minor ?? 0
  const patch = parsed?.patch ?? 0
  if (level === 'major') {
    return `${major + 1}.0.0`
  }
  if (level === 'minor') {
    return `${major}.${minor + 1}.0`
  }
  return `${major}.${minor}.${patch + 1}`
}

export interface ResolveBumpBaseConfig {
  manifestVersion: string
  publishedVersion?: string | undefined
  tagVersion?: string | undefined
}

export function resolveChangelogBumpBase(
  config: ResolveBumpBaseConfig,
): string {
  const cfg = { __proto__: null, ...config } as ResolveBumpBaseConfig
  const released: string[] = []
  if (cfg.publishedVersion) {
    released.push(cfg.publishedVersion)
  }
  if (cfg.tagVersion) {
    released.push(cfg.tagVersion.replace(/^v/, ''))
  }
  return (
    maxVersion(released) ?? cfg.manifestVersion.split('-')[0]!.split('+')[0]!
  )
}

export function isPrereleaseVersion(version: string): boolean {
  return (parseVersion(version)?.prerelease?.length ?? 0) > 0
}
