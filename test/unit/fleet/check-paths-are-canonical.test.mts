// vitest spec for the path-hygiene check's helper modules. The main
// entry point (paths-are-canonical.mts) is NOT entrypoint-guarded, so
// tests import the exported pure functions from each sub-module directly:
// allowlist.mts (snippetHash, isAllowlisted, loadAllowlist), scan-code.mts
// (extractPathCalls, extractStringLiterals, templateLiteralSegments),
// scan-workflow.mts (isInsideComputePathsBlock), rules.mts (checkRuleF),
// and state.mts (clearFindings, getFindings, pushFinding). Fixtures are
// temp dirs built with node:fs; no network or real git calls are made.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  isAllowlisted,
  loadAllowlist,
  snippetHash,
} from '../../../scripts/fleet/check/paths/allowlist.mts'
import { checkRuleF } from '../../../scripts/fleet/check/paths/rules.mts'
import {
  extractPathCalls,
  extractStringLiterals,
  scanCodeFile,
  templateLiteralSegments,
} from '../../../scripts/fleet/check/paths/scan-code.mts'
import { isInsideComputePathsBlock } from '../../../scripts/fleet/check/paths/scan-workflow.mts'
import {
  clearFindings,
  getFindings,
  pushFinding,
} from '../../../scripts/fleet/check/paths/state.mts'
import type {
  AllowlistEntry,
  Finding,
} from '../../../scripts/fleet/check/paths/types.mts'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeFinding(partial: Partial<Finding> = {}): Finding {
  return {
    rule: 'A',
    file: 'src/foo.mts',
    line: 1,
    snippet: "path.join('build', 'Final')",
    message: 'Multi-stage path',
    fix: 'use paths.mts',
    ...partial,
  }
}

// ---------------------------------------------------------------------------
// snippetHash
// ---------------------------------------------------------------------------

describe('snippetHash', () => {
  test('returns a 12-char hex string', () => {
    const h = snippetHash("path.join('build', 'Final')")
    assert.equal(typeof h, 'string')
    assert.equal(h.length, 12)
    assert.match(h, /^[0-9a-f]{12}$/)
  })

  test('is whitespace-insensitive', () => {
    const a = snippetHash("path.join('build',  'Final')")
    const b = snippetHash("path.join('build', 'Final')")
    assert.equal(a, b)
  })

  test('is content-sensitive', () => {
    const a = snippetHash("path.join('build', 'Final')")
    const b = snippetHash("path.join('build', 'Release')")
    assert.notEqual(a, b)
  })
})

// ---------------------------------------------------------------------------
// isAllowlisted
// ---------------------------------------------------------------------------

describe('isAllowlisted', () => {
  const finding = makeFinding({
    rule: 'A',
    file: 'src/foo.mts',
    line: 5,
    snippet: "path.join('build', 'Final')",
  })

  test('empty allowlist → not allowlisted', () => {
    assert.equal(isAllowlisted(finding, []), false)
  })

  test('matching by rule + file + line → allowlisted', () => {
    const entry: AllowlistEntry = {
      rule: 'A',
      file: 'src/foo.mts',
      line: 5,
      reason: 'intentional',
    }
    assert.equal(isAllowlisted(finding, [entry]), true)
  })

  test('matching by snippet_hash → allowlisted even if line differs', () => {
    const entry: AllowlistEntry = {
      rule: 'A',
      file: 'src/foo.mts',
      snippet_hash: snippetHash(finding.snippet),
      reason: 'intentional',
    }
    const shifted = { ...finding, line: 999 }
    assert.equal(isAllowlisted(shifted, [entry]), true)
  })

  test('wrong rule → not allowlisted', () => {
    const entry: AllowlistEntry = {
      rule: 'B',
      file: 'src/foo.mts',
      line: 5,
      reason: 'x',
    }
    assert.equal(isAllowlisted(finding, [entry]), false)
  })

  test('wrong line without hash → not allowlisted', () => {
    const entry: AllowlistEntry = {
      rule: 'A',
      file: 'src/foo.mts',
      line: 99,
      reason: 'x',
    }
    assert.equal(isAllowlisted(finding, [entry]), false)
  })

  test('pattern match passes when snippet contains the pattern', () => {
    const entry: AllowlistEntry = { pattern: "'build'", reason: 'x' }
    assert.equal(isAllowlisted(finding, [entry]), true)
  })

  test('pattern mismatch fails', () => {
    const entry: AllowlistEntry = { pattern: 'NOPE', reason: 'x' }
    assert.equal(isAllowlisted(finding, [entry]), false)
  })
})

// ---------------------------------------------------------------------------
// loadAllowlist
// ---------------------------------------------------------------------------

describe('loadAllowlist', () => {
  test('returns empty array when no config exists', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'paths-check-'))
    assert.deepEqual(loadAllowlist(root), [])
  })

  test('loads entries from .config/socket-wheelhouse.json', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'paths-check-'))
    mkdirSync(path.join(root, '.config'), { recursive: true })
    writeFileSync(
      path.join(root, '.config', 'socket-wheelhouse.json'),
      JSON.stringify({
        pathsAllowlist: [
          { rule: 'A', file: 'src/foo.mts', line: 1, reason: 'intentional' },
        ],
      }),
    )
    const entries = loadAllowlist(root)
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.reason, 'intentional')
    assert.equal(entries[0]!.rule, 'A')
  })

  test('skips entries missing reason', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'paths-check-'))
    mkdirSync(path.join(root, '.config'), { recursive: true })
    writeFileSync(
      path.join(root, '.config', 'socket-wheelhouse.json'),
      JSON.stringify({
        pathsAllowlist: [{ rule: 'A', file: 'src/foo.mts', line: 1 }],
      }),
    )
    assert.deepEqual(loadAllowlist(root), [])
  })

  test('returns empty when pathsAllowlist key is absent', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'paths-check-'))
    mkdirSync(path.join(root, '.config'), { recursive: true })
    writeFileSync(
      path.join(root, '.config', 'socket-wheelhouse.json'),
      JSON.stringify({ bundle: { ref: 'abc' } }),
    )
    assert.deepEqual(loadAllowlist(root), [])
  })

  test('also reads legacy root-level dotfile', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'paths-check-'))
    writeFileSync(
      path.join(root, '.socket-wheelhouse.json'),
      JSON.stringify({
        pathsAllowlist: [{ file: 'src/bar.mts', reason: 'legacy' }],
      }),
    )
    const entries = loadAllowlist(root)
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.reason, 'legacy')
  })
})

// ---------------------------------------------------------------------------
// extractPathCalls
// ---------------------------------------------------------------------------

describe('extractPathCalls', () => {
  test('finds a simple path.join call', () => {
    const calls = extractPathCalls("const x = path.join('a', 'b')")
    assert.equal(calls.length, 1)
    assert.match(calls[0]!.args, /'a', 'b'/)
  })

  test('finds path.resolve call', () => {
    const calls = extractPathCalls("path.resolve(__dirname, 'foo')")
    assert.equal(calls.length, 1)
  })

  test('handles nested parens correctly', () => {
    const calls = extractPathCalls(
      "path.join(getDir(child(x)), 'build', 'Final')",
    )
    assert.equal(calls.length, 1)
    assert.match(calls[0]!.args, /'build', 'Final'/)
  })

  test('finds multiple calls', () => {
    const src = "path.join('a', 'b'); path.join('c', 'd')"
    assert.equal(extractPathCalls(src).length, 2)
  })

  test('returns empty when no path calls', () => {
    assert.deepEqual(extractPathCalls('const x = 1'), [])
  })
})

// ---------------------------------------------------------------------------
// extractStringLiterals
// ---------------------------------------------------------------------------

describe('extractStringLiterals', () => {
  test('extracts single and double quoted strings', () => {
    const literals = extractStringLiterals('\'build\', "Final"')
    assert.deepEqual(literals, ['build', 'Final'])
  })

  test('handles escaped quotes inside strings', () => {
    const literals = extractStringLiterals(
      '\'it\\\'s\', "she said \\"hello\\""',
    )
    assert.equal(literals.length, 2)
    assert.equal(literals[0], "it\\'s")
  })

  test('returns empty for no string literals', () => {
    assert.deepEqual(extractStringLiterals('x + y'), [])
  })
})

// ---------------------------------------------------------------------------
// templateLiteralSegments
// ---------------------------------------------------------------------------

describe('templateLiteralSegments', () => {
  test('splits on slashes and strips placeholders', () => {
    const segs = templateLiteralSegments('build/${mode}/out/Final')
    assert.deepEqual(segs, ['build', 'out', 'Final'])
  })

  test('adjacent placeholders leave no empty segments', () => {
    const segs = templateLiteralSegments('${a}/${b}/Final')
    assert.deepEqual(segs, ['Final'])
  })

  test('no slashes → single segment or empty', () => {
    const segs = templateLiteralSegments('Final')
    assert.deepEqual(segs, ['Final'])
  })
})

// ---------------------------------------------------------------------------
// isInsideComputePathsBlock
// ---------------------------------------------------------------------------

describe('isInsideComputePathsBlock', () => {
  test('returns true when current line is inside a Compute paths step', () => {
    const lines = [
      '    - name: Compute build paths',
      '      id: paths',
      '      run: echo "path=build/prod/linux-x64/out/Final" >> $GITHUB_OUTPUT',
      '      run: echo "done"',
    ]
    // lineIdx=2 is the run line inside the Compute step
    assert.equal(isInsideComputePathsBlock(lines, 2), true)
  })

  test('returns false when current line is in a different step', () => {
    const lines = [
      '    - name: Compute build paths',
      '      id: paths',
      '      run: echo "path" >> $GITHUB_OUTPUT',
      '    - name: Deploy',
      '      run: ./deploy.sh',
    ]
    assert.equal(isInsideComputePathsBlock(lines, 4), false)
  })

  test('returns false with no step header at all', () => {
    const lines = ['    run: echo "hello"']
    assert.equal(isInsideComputePathsBlock(lines, 0), false)
  })
})

// ---------------------------------------------------------------------------
// state: clearFindings / getFindings / pushFinding
// ---------------------------------------------------------------------------

describe('state module', () => {
  test('clearFindings resets the shared findings array', () => {
    clearFindings()
    pushFinding(makeFinding())
    assert.equal(getFindings().length, 1)
    clearFindings()
    assert.equal(getFindings().length, 0)
  })

  test('pushFinding accumulates findings', () => {
    clearFindings()
    pushFinding(makeFinding({ file: 'a.mts' }))
    pushFinding(makeFinding({ file: 'b.mts' }))
    assert.equal(getFindings().length, 2)
    clearFindings()
  })
})

// ---------------------------------------------------------------------------
// scanCodeFile — PASS case (no findings for a clean file)
// ---------------------------------------------------------------------------

describe('scanCodeFile', () => {
  test('no finding for a file that uses a pre-computed path import', () => {
    clearFindings()
    const root = mkdtempSync(path.join(os.tmpdir(), 'paths-scan-'))
    mkdirSync(path.join(root, 'src'), { recursive: true })
    // Only single-segment path.join — no stage/build/mode combination
    writeFileSync(
      path.join(root, 'src', 'clean.mts'),
      [
        "import { BINARY_PATH } from '../scripts/paths.mts'",
        'export const foo = BINARY_PATH',
      ].join('\n'),
    )
    scanCodeFile(root, 'src/clean.mts')
    assert.equal(getFindings().length, 0)
    clearFindings()
  })

  test('Rule A finding for inline multi-stage path.join with 2+ stage segments', () => {
    clearFindings()
    const root = mkdtempSync(path.join(os.tmpdir(), 'paths-scan-'))
    mkdirSync(path.join(root, 'src'), { recursive: true })
    // 'Final' and 'Release' are both STAGE_SEGMENTS → Rule A fires
    writeFileSync(
      path.join(root, 'src', 'bad.mts'),
      "const p = path.join(__dirname, 'Final', 'Release')\n",
    )
    scanCodeFile(root, 'src/bad.mts')
    const findings = getFindings()
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.rule, 'A')
    assert.match(findings[0]!.message, /Multi-stage path/)
    clearFindings()
  })

  test('Rule A finding for stage + build-root + mode combination', () => {
    clearFindings()
    const root = mkdtempSync(path.join(os.tmpdir(), 'paths-scan-'))
    mkdirSync(path.join(root, 'src'), { recursive: true })
    // 'Final' (stage) + 'build' (build-root) + 'prod' (mode) → Rule A
    writeFileSync(
      path.join(root, 'src', 'combo.mts'),
      "const p = path.join(root, 'build', 'prod', 'Final')\n",
    )
    scanCodeFile(root, 'src/combo.mts')
    const findings = getFindings()
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.rule, 'A')
    clearFindings()
  })
})

// ---------------------------------------------------------------------------
// checkRuleF — promotes cross-file Rule-A findings to Rule F
// ---------------------------------------------------------------------------

describe('checkRuleF', () => {
  test('promotes Rule A findings with the same literal shape in 2+ files to Rule F', () => {
    clearFindings()
    pushFinding(
      makeFinding({
        rule: 'A',
        file: 'src/a.mts',
        snippet: "path.join('Final', 'Release')",
      }),
    )
    pushFinding(
      makeFinding({
        rule: 'A',
        file: 'src/b.mts',
        snippet: "path.join('Final', 'Release')",
      }),
    )
    checkRuleF()
    const findings = getFindings()
    assert.equal(findings.length, 2)
    assert.equal(findings[0]!.rule, 'F')
    assert.equal(findings[1]!.rule, 'F')
    clearFindings()
  })

  test('does NOT promote when both Rule-A findings are in the same file', () => {
    clearFindings()
    pushFinding(
      makeFinding({
        rule: 'A',
        file: 'src/same.mts',
        snippet: "path.join('Final', 'Release')",
      }),
    )
    pushFinding(
      makeFinding({
        rule: 'A',
        file: 'src/same.mts',
        snippet: "path.join('Final', 'Release')",
        line: 2,
      }),
    )
    checkRuleF()
    const findings = getFindings()
    // Still Rule A — same file, not cross-file duplication
    assert.equal(findings[0]!.rule, 'A')
    assert.equal(findings[1]!.rule, 'A')
    clearFindings()
  })

  test('leaves non-Rule-A findings untouched', () => {
    clearFindings()
    pushFinding(makeFinding({ rule: 'B', file: 'src/x.mts' }))
    checkRuleF()
    assert.equal(getFindings()[0]!.rule, 'B')
    clearFindings()
  })
})
