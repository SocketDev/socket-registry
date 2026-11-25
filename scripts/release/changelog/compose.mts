/**
 * Compose a release section or promote the entries under Unreleased.
 */
import { hasListItem } from './markdown.mts'
import {
  renderBullet,
  renderSectionMap,
  TYPE_TO_SECTION,
  unreleasedRange,
} from './render.mts'
import { changelogInternalScope, isChangelogDevScope } from './scopes.mts'
import { isPrereleaseVersion } from './commits.mts'
import type { ConventionalCommit } from './commits.mts'

export function changelogRepoUrl(
  repositoryUrl: string | undefined,
): string | undefined {
  if (!repositoryUrl) {
    return undefined
  }
  const m = /github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/.]+)/.exec(
    repositoryUrl,
  )
  if (!m?.groups) {
    return undefined
  }
  return `https://github.com/${m.groups['owner']}/${m.groups['repo']}`
}

export function changelogHeading(
  version: string,
  date: string,
  repoUrl: string | undefined,
): string {
  return repoUrl && !isPrereleaseVersion(version)
    ? `## [${version}](${repoUrl}/releases/tag/v${version}) - ${date}`
    : `## ${version} - ${date}`
}

export function composeChangelogSectionFromCommits(config: {
  commits: readonly ConventionalCommit[]
  date: string
  repoUrl: string | undefined
  version: string
  heading?: string | undefined
}): string {
  const {
    commits,
    date,
    heading: headingOverride,
    repoUrl,
    version,
  } = {
    __proto__: null,
    ...config,
  } as {
    commits: readonly ConventionalCommit[]
    date: string
    heading?: string | undefined
    repoUrl: string | undefined
    version: string
  }
  const heading = headingOverride ?? changelogHeading(version, date, repoUrl)
  const bySection = new Map<string, string[]>()
  for (let i = 0, { length } = commits; i < length; i += 1) {
    const commit = commits[i]!
    const rawSection =
      TYPE_TO_SECTION[commit.type] ?? (commit.breaking ? 'Changed' : undefined)
    if (!rawSection) {
      continue
    }
    const section = isChangelogDevScope(commit.scope)
      ? changelogInternalScope
      : rawSection
    const bullets = bySection.get(section) ?? []
    bullets.push(renderBullet(commit))
    bySection.set(section, bullets)
  }
  return renderSectionMap(heading, bySection)
}

export const UNRELEASED_HEADING = '## [Unreleased]'

export function changelogSectionHasEntries(section: string): boolean {
  return hasListItem(section)
}

export function withChangelogEntry(section: string, bullet: string): string {
  return `${section}\n\n### Changed\n\n- ${bullet}`
}

export function promoteChangelogUnreleasedSection(
  changelog: string,
  versionHeading: string,
): { changelog: string; section: string } | undefined {
  const lines = changelog.split(/\r?\n/)
  const range = unreleasedRange(lines, UNRELEASED_HEADING)
  if (!range) {
    return undefined
  }
  const body = lines
    .slice(range.start + 1, range.end)
    .join('\n')
    .trim()
  if (!changelogSectionHasEntries(body)) {
    return undefined
  }
  const remainder = [...lines.slice(0, range.start), ...lines.slice(range.end)]
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .replace(/\s+$/u, '\n')
  return { changelog: remainder, section: `${versionHeading}\n\n${body}` }
}
