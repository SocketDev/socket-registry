/**
 * @file Read and insert version sections in the registry changelog.
 */
import { documentHeadings, headingLines } from './markdown.mts'
import type { MarkdownHeading } from './markdown.mts'

// The version a ## heading names: optional [ and v, then semver core + prerelease.
// oxlint-disable-next-line socket/prefer-non-capturing-group -- capture used via .exec(...)?.[1]
const HEADING_VERSION_RE = /^\[?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/

function findChangelogSectionHeadings(changelog: string): MarkdownHeading[] {
  return documentHeadings(changelog).filter(heading => heading.depth === 2)
}

function headingNamesVersion(text: string, version: string): boolean {
  const rest = text.trim().replace(/^\[/, '').replace(/^v/, '')
  return rest.startsWith(version) && !/^[0-9.]/.test(rest.slice(version.length))
}

export function hasChangelogVersionSection(
  changelog: string,
  version: string,
): boolean {
  return findChangelogSectionHeadings(changelog).some(heading =>
    headingNamesVersion(heading.text, version),
  )
}

export function insertChangelogVersionSection(
  existing: string,
  section: string,
): string {
  const sectionHeading = findChangelogSectionHeadings(section)[0]
  const sectionVersion = sectionHeading
    ? HEADING_VERSION_RE.exec(sectionHeading.text)?.[1]
    : undefined
  if (
    sectionVersion !== undefined &&
    hasChangelogVersionSection(existing, sectionVersion)
  ) {
    return existing
  }
  const lines = existing.split(/\r?\n/)
  const firstHeading = headingLines(existing, 2)[0] ?? -1
  if (firstHeading === -1) {
    return `${existing.replace(/\s*$/, '')}\n\n${section}\n`
  }
  const before = lines.slice(0, firstHeading).join('\n').replace(/\s*$/, '')
  const after = lines.slice(firstHeading).join('\n')
  return `${before}\n\n${section}\n\n${after}`
}
