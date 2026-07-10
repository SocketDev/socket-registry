/**
 * @file Tests for the JSDoc-flatten detector. The cases are drawn from real
 *   oxfmt output — the mangle samples are lines a `balance`-mode format pass
 *   actually produced (a section heading sucked onto a wrapped prose tail), and
 *   the clean samples include the emphasis/acronym shapes that must NOT trip
 *   it.
 */

import { describe, expect, test } from 'vitest'

import {
  blockCommentLines,
  detectMangled,
} from '../../../scripts/fleet/restore-jsdoc.mts'

// Wrap a description body in a block comment so the detector sees it.
function asComment(...bodyLines: string[]): string {
  return [
    '/**',
    ...bodyLines.map(l => ` * ${l}`),
    ' */',
    'export const x = 1',
  ].join('\n')
}

describe('blockCommentLines', () => {
  test('extracts ` * ` bodies with absolute line numbers', () => {
    const src = asComment('@file One.', 'second line.')
    const lines = blockCommentLines(src)
    expect(lines.map(l => l.text)).toContain('@file One.')
    expect(lines.map(l => l.text)).toContain('second line.')
  })

  test('ignores code outside the block', () => {
    const src = 'const y = 1\n' + asComment('@file Doc.')
    const texts = blockCommentLines(src).map(l => l.text)
    expect(texts.some(t => t.includes('const y'))).toBe(false)
  })
})

describe('detectMangled — real oxfmt flatten signatures (flagged)', () => {
  test('section heading orphaned onto a wrapped prose tail', () => {
    // A real wrapped line is at/near the 80-col print width — the detector
    // only inspects long (formatter-wrapped) lines, so the fixture must be one.
    const src = asComment(
      'the sources, queries, date range, and counts so the result is reproducible and falsifiable. CORPUS',
    )
    expect(detectMangled(src).length).toBeGreaterThan(0)
  })

  test('colon-tagged heading flattened mid-line (USAGE:)', () => {
    const src = asComment(
      'the measurements plus a manifest, never a fabricated provenance. USAGE: x',
    )
    expect(detectMangled(src).length).toBeGreaterThan(0)
  })

  test('trailing heading word where the wrap broke (WHAT)', () => {
    const src = asComment(
      'requires an authenticated gh; note if gh is absent so the local-only run still works offline. WHAT',
    )
    expect(detectMangled(src).length).toBeGreaterThan(0)
  })
})

describe('detectMangled — emphasis / acronyms / clean (NOT flagged)', () => {
  test('uppercase emphasis followed by more prose is not a heading', () => {
    const src = asComment(
      'is set. THIS IS THE DEFAULT path and staging gives a reject hook here too',
    )
    expect(detectMangled(src)).toEqual([])
  })

  test('an acronym mid-sentence is not a heading', () => {
    const src = asComment(
      'with a single shared 2FA OTP. Designed to run locally with a long tail here',
    )
    expect(detectMangled(src)).toEqual([])
  })

  test('a heading at line START is the intended shape', () => {
    const src = asComment(
      'PURPOSE. Produce an evidence-backed summary of how a person writes things',
    )
    expect(detectMangled(src)).toEqual([])
  })

  test('a short one-section description never trips', () => {
    const src = asComment('@file Short. USAGE: node x.mts')
    expect(detectMangled(src)).toEqual([])
  })
})
