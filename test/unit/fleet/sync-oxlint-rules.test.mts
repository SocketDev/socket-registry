/**
 * @file Unit tests for the oxlintrc socket/* splice in sync-oxlint-rules.
 *   Focus: multi-line activations (an options array oxfmt wrapped across
 *   lines) must be claimed whole by the span scanner — the line-based
 *   contiguity guard once mis-read a wrapped entry's continuation lines as
 *   foreign rules and refused to splice.
 */
import { describe, expect, it } from 'vitest'

import { rewriteOxlintrc } from '../../../scripts/fleet/sync-oxlint-rules.mts'

function fixture(socketBlock: string): string {
  return [
    '{',
    '  "rules": {',
    socketBlock,
    '    "eslint/curly": "error"',
    '  },',
    '  "overrides": []',
    '}',
  ].join('\n')
}

describe('rewriteOxlintrc', () => {
  it('splices single-line activations', () => {
    const source = fixture(
      ['    "socket/aaa": "error",', '    "socket/bbb": "error",'].join('\n'),
    )
    const out = rewriteOxlintrc(source, ['aaa', 'ccc'])
    expect(out).toContain('"socket/aaa": "error",')
    expect(out).toContain('"socket/ccc": "error",')
    expect(out).not.toContain('"socket/bbb"')
    expect(out).toContain('"eslint/curly": "error"')
  })

  it('claims a multi-line options activation as one span', () => {
    const source = fixture(
      [
        '    "socket/aaa": "error",',
        '    "socket/bbb": [',
        '      "error",',
        '      { "additionalTestBlockFunctions": ["cmdit"] }',
        '    ],',
        '    "socket/ccc": "error",',
      ].join('\n'),
    )
    const out = rewriteOxlintrc(source, ['aaa', 'bbb', 'ccc'])
    // The wrapped options survive the splice (re-rendered single-line).
    expect(out).toContain(
      '"socket/bbb": ["error",{"additionalTestBlockFunctions":["cmdit"]}],',
    )
    const parsed = JSON.parse(out.replace(/,(\s*})/g, '$1')) as {
      rules: Record<string, unknown>
    }
    expect(Object.keys(parsed.rules)).toEqual([
      'socket/aaa',
      'socket/bbb',
      'socket/ccc',
      'eslint/curly',
    ])
  })

  it('refuses to splice around an interleaved foreign rule', () => {
    const source = fixture(
      [
        '    "socket/aaa": "error",',
        '    "unicorn/zzz": "error",',
        '    "socket/ccc": "error",',
      ].join('\n'),
    )
    expect(() => rewriteOxlintrc(source, ['aaa', 'ccc'])).toThrow(
      /not contiguous/,
    )
  })
})
