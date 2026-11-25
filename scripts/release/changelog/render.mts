/**
 * @file Internal Markdown-rendering helpers for the release CHANGELOG —
 *   commit-type → section mapping, bullet escaping/formatting, and the
 *   `[Unreleased]` line-range scanner shared by compose.mts.
 */
import { headingLines } from './markdown.mts'
import type { ConventionalCommit } from './commits.mts'

export const TYPE_TO_SECTION: Record<string, string> = {
  __proto__: null,
  feat: 'Added',
  fix: 'Fixed',
  perf: 'Changed',
  revert: 'Changed',
} as unknown as Record<string, string>

export const SECTION_ORDER: readonly string[] = ['Added', 'Changed', 'Fixed']

function escapeMarkdownText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeMarkdownProse(value: string): string {
  return escapeMarkdownText(value).replace(/[\\`*_]/gu, '\\$&')
}

export function renderBullet(commit: ConventionalCommit): string {
  const scope = commit.scope
    ? `**\`${escapeMarkdownText(commit.scope)}\`** — `
    : ''
  const description = escapeMarkdownProse(commit.description)
  return `- ${scope}${commit.breaking ? `_${description}_` : description}`
}

export function unreleasedRange(
  lines: readonly string[],
  unreleasedHeading: string,
): { end: number; start: number } | undefined {
  const wanted = unreleasedHeading.trim().toLowerCase()
  const headings = headingLines(lines.join('\n'), 2)
  const at = headings.findIndex(
    line => lines[line]?.trim().toLowerCase() === wanted,
  )
  if (at === -1) {
    return undefined
  }
  const next = headings[at + 1]
  return { end: next ?? lines.length, start: headings[at]! }
}

export function renderSectionMap(
  heading: string,
  bySection: Map<string, string[]>,
): string {
  const blocks: string[] = [heading]
  const emit = (section: string): void => {
    const bullets = bySection.get(section)
    if (bullets && bullets.length > 0) {
      blocks.push(`### ${section}\n\n${bullets.join('\n')}`)
    }
  }
  for (let i = 0, { length } = SECTION_ORDER; i < length; i += 1) {
    emit(SECTION_ORDER[i]!)
  }
  for (const section of bySection.keys()) {
    if (!SECTION_ORDER.includes(section)) {
      emit(section)
    }
  }
  return blocks.join('\n\n')
}
