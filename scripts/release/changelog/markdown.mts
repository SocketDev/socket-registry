import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'

import type { Nodes, Root } from 'mdast'

export interface MarkdownHeading {
  /**
   * ATX (`## x`) or setext (`x\n--`) level, 1 through 6.
   */
  depth: number
  /**
   * 0-based index of the line the heading starts on.
   */
  line: number
  /**
   * Flattened text content — no `#` markers, and a link contributes its label,
   * so `## [1.2.3](url) - 2026-01-01` reads as `1.2.3 - 2026-01-01`.
   */
  text: string
}

/**
 * Parse Markdown the way GitHub renders it (GFM: tables, strikethrough,
 * autolinks, task lists) into a position-tracked mdast tree.
 */
export function parseMarkdown(source: string): Root {
  return fromMarkdown(source, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  })
}

/**
 * A node's flattened text content. Code spans keep their literal value; raw
 * HTML and images contribute nothing, so a heading's text is what a reader
 * sees rather than what the source spells.
 */
export function nodeText(node: Nodes): string {
  switch (node.type) {
    case 'inlineCode':
    case 'text':
      return node.value
    default:
      return 'children' in node ? node.children.map(nodeText).join('') : ''
  }
}

/**
 * Every TOP-LEVEL heading, in source order. Top-level is deliberate: a heading
 * nested in a blockquote or a list item is quoted content, not a section of
 * this document, and treating it as one splits a section in half.
 */
export function documentHeadings(source: string): MarkdownHeading[] {
  const out: MarkdownHeading[] = []
  for (const node of parseMarkdown(source).children) {
    if (node.type === 'heading' && node.position) {
      out.push({
        depth: node.depth,
        line: node.position.start.line - 1,
        text: nodeText(node).trim(),
      })
    }
  }
  return out
}

/**
 * 0-based line indexes of the document's level-`depth` headings — the section
 * boundaries a changelog edit slices on.
 */
export function headingLines(source: string, depth: number): number[] {
  const out: number[] = []
  for (const heading of documentHeadings(source)) {
    if (heading.depth === depth) {
      out.push(heading.line)
    }
  }
  return out
}

function nodeHasListItem(node: Nodes): boolean {
  if (node.type === 'listItem') {
    return true
  }
  return 'children' in node ? node.children.some(nodeHasListItem) : false
}

/**
 * True when the Markdown carries at least one real list item, as opposed to a
 * bare heading with nothing under it. Parsed, not pattern matched: a `- ` line
 * inside a fenced code block is a code sample, not an entry.
 */
export function hasListItem(source: string): boolean {
  return parseMarkdown(source).children.some(nodeHasListItem)
}
