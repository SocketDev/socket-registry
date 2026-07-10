// vitest specs for the ai-lint-fix prompt builders.

import assert from 'node:assert/strict'
import path from 'node:path'
import process from 'node:process'

import { describe, test } from 'vitest'

import {
  AI_HANDLED_RULES,
  RULE_GUIDANCE,
} from '../../../scripts/fleet/ai-lint-fix/rule-guidance.mts'
import {
  bucketFindings,
  buildPrompt,
  renderFindings,
  renderRuleGuidance,
} from '../../../scripts/fleet/ai-lint-fix/prompt.mts'

import type {
  OxlintFile,
  OxlintMessage,
} from '../../../scripts/fleet/ai-lint-fix/oxlint-json.mts'

// ── fixtures ─────────────────────────────────────────────────────────────────

function makeMsg(
  ruleId: string | undefined,
  message = 'test message',
  line = 1,
  column = 1,
): OxlintMessage {
  return { ruleId, message, severity: 2, line, column }
}

// A rule guaranteed to be in AI_HANDLED_RULES
const HANDLED_RULE = 'socket/prefer-undefined-over-null'
// A rule guaranteed NOT to be in AI_HANDLED_RULES
const UNHANDLED_RULE = 'no-unused-vars'

// ── bucketFindings ────────────────────────────────────────────────────────────

describe('bucketFindings', () => {
  test('returns empty map when given no files', () => {
    const result = bucketFindings([])
    assert.equal(result.size, 0)
  })

  test('returns empty map when no messages match AI_HANDLED_RULES', () => {
    const files: OxlintFile[] = [
      { filePath: 'src/foo.mts', messages: [makeMsg(UNHANDLED_RULE)] },
    ]
    const result = bucketFindings(files)
    assert.equal(result.size, 0)
  })

  test('returns empty map when messages have no ruleId', () => {
    const files: OxlintFile[] = [
      { filePath: 'src/foo.mts', messages: [makeMsg(undefined)] },
    ]
    const result = bucketFindings(files)
    assert.equal(result.size, 0)
  })

  test('includes file when at least one message matches AI_HANDLED_RULES', () => {
    const files: OxlintFile[] = [
      {
        filePath: 'src/foo.mts',
        messages: [makeMsg(UNHANDLED_RULE), makeMsg(HANDLED_RULE)],
      },
    ]
    const result = bucketFindings(files)
    assert.equal(result.size, 1)
    assert.ok(result.has('src/foo.mts'))
    const msgs = result.get('src/foo.mts')!
    assert.equal(msgs.length, 1)
    assert.equal(msgs[0]!.ruleId, HANDLED_RULE)
  })

  test('filters out non-AI-handled messages within the same file', () => {
    const files: OxlintFile[] = [
      {
        filePath: 'src/bar.mts',
        messages: [
          makeMsg(HANDLED_RULE, 'first', 1, 1),
          makeMsg(UNHANDLED_RULE, 'skip', 2, 1),
          makeMsg('socket/max-file-lines', 'second', 3, 1),
        ],
      },
    ]
    const result = bucketFindings(files)
    const msgs = result.get('src/bar.mts')!
    assert.equal(msgs.length, 2)
    assert.equal(msgs[0]!.ruleId, HANDLED_RULE)
    assert.equal(msgs[1]!.ruleId, 'socket/max-file-lines')
  })

  test('handles multiple files independently', () => {
    const files: OxlintFile[] = [
      { filePath: 'a.mts', messages: [makeMsg(HANDLED_RULE)] },
      { filePath: 'b.mts', messages: [makeMsg(UNHANDLED_RULE)] },
      { filePath: 'c.mts', messages: [makeMsg('socket/no-placeholders')] },
    ]
    const result = bucketFindings(files)
    assert.equal(result.size, 2)
    assert.ok(result.has('a.mts'))
    assert.ok(!result.has('b.mts'))
    assert.ok(result.has('c.mts'))
  })

  test('skips file with only messages having no ruleId mixed with unhandled', () => {
    const files: OxlintFile[] = [
      {
        filePath: 'src/noid.mts',
        messages: [makeMsg(undefined), makeMsg(UNHANDLED_RULE)],
      },
    ]
    const result = bucketFindings(files)
    assert.equal(result.size, 0)
  })

  test('all AI_HANDLED_RULES are recognized', () => {
    const allRules = [...AI_HANDLED_RULES]
    const files: OxlintFile[] = allRules.map((ruleId, i) => ({
      filePath: `file${i}.mts`,
      messages: [makeMsg(ruleId)],
    }))
    const result = bucketFindings(files)
    assert.equal(result.size, allRules.length)
  })
})

// ── renderFindings ────────────────────────────────────────────────────────────

describe('renderFindings', () => {
  test('renders a single finding as indented XML', () => {
    const findings: OxlintMessage[] = [
      makeMsg(HANDLED_RULE, 'use undefined', 10, 5),
    ]
    const out = renderFindings(findings)
    assert.ok(
      out.startsWith('  <finding'),
      `expected indented finding, got: ${out}`,
    )
    assert.ok(out.includes(`rule="${HANDLED_RULE}"`))
    assert.ok(out.includes('line="10"'))
    assert.ok(out.includes('column="5"'))
    assert.ok(out.includes('use undefined'))
  })

  test('escapes < in message', () => {
    const out = renderFindings([makeMsg(HANDLED_RULE, 'a < b')])
    assert.ok(out.includes('a &lt; b'), `expected &lt; in: ${out}`)
    assert.ok(!out.includes('a < b'))
  })

  test('escapes > in message', () => {
    const out = renderFindings([makeMsg(HANDLED_RULE, 'a > b')])
    assert.ok(out.includes('a &gt; b'), `expected &gt; in: ${out}`)
  })

  test('escapes & in message', () => {
    const out = renderFindings([makeMsg(HANDLED_RULE, 'a & b')])
    assert.ok(out.includes('a &amp; b'), `expected &amp; in: ${out}`)
  })

  test('collapses newlines in message to spaces', () => {
    const out = renderFindings([makeMsg(HANDLED_RULE, 'line1\nline2')])
    assert.ok(out.includes('line1 line2'), `expected newline collapsed: ${out}`)
    assert.ok(
      !out.includes('\n  <finding'),
      'newline should not appear inside finding content',
    )
  })

  test('renders multiple findings separated by newlines', () => {
    const findings: OxlintMessage[] = [
      makeMsg(HANDLED_RULE, 'first', 1, 1),
      makeMsg('socket/no-placeholders', 'second', 5, 3),
    ]
    const out = renderFindings(findings)
    const lines = out.split('\n')
    assert.equal(lines.length, 2)
    assert.ok(lines[0]!.includes('first'))
    assert.ok(lines[1]!.includes('second'))
  })

  test('returns empty string for empty array', () => {
    const out = renderFindings([])
    assert.equal(out, '')
  })

  test('escapes all three special chars in same message', () => {
    const out = renderFindings([makeMsg(HANDLED_RULE, '<a> & <b>')])
    assert.ok(out.includes('&lt;a&gt; &amp; &lt;b&gt;'), `got: ${out}`)
  })
})

// ── renderRuleGuidance ────────────────────────────────────────────────────────

describe('renderRuleGuidance', () => {
  test('returns empty string when no findings', () => {
    const out = renderRuleGuidance([])
    assert.equal(out, '')
  })

  test('returns empty string when no ruleId on findings', () => {
    const out = renderRuleGuidance([makeMsg(undefined)])
    assert.equal(out, '')
  })

  test('returns empty string when rule has no RULE_GUIDANCE entry', () => {
    const out = renderRuleGuidance([makeMsg('socket/unknown-rule-xyz')])
    assert.equal(out, '')
  })

  test('renders a rules block for a known rule', () => {
    const out = renderRuleGuidance([makeMsg(HANDLED_RULE)])
    assert.ok(out.startsWith('<rules>'), `expected <rules> block: ${out}`)
    assert.ok(out.endsWith('</rules>'), `expected </rules>: ${out}`)
    assert.ok(out.includes(`<rule id="${HANDLED_RULE}">`))
    assert.ok(out.includes('</rule>'))
    assert.ok(out.includes(RULE_GUIDANCE[HANDLED_RULE]!))
  })

  test('deduplicates repeated rule IDs', () => {
    const findings = [
      makeMsg(HANDLED_RULE, 'first', 1, 1),
      makeMsg(HANDLED_RULE, 'second', 2, 1),
    ]
    const out = renderRuleGuidance(findings)
    // Should appear exactly once
    const count = (
      out.match(new RegExp(`rule id="${HANDLED_RULE}"`, 'g')) ?? []
    ).length
    assert.equal(count, 1)
  })

  test('sorts rules alphabetically', () => {
    const findings = [
      makeMsg('socket/prefer-undefined-over-null'),
      makeMsg('socket/no-placeholders'),
      makeMsg('socket/inclusive-language'),
    ]
    const out = renderRuleGuidance(findings)
    const idxInclusive = out.indexOf('socket/inclusive-language')
    const idxNoPlaceholders = out.indexOf('socket/no-placeholders')
    const idxPreferUndefined = out.indexOf('socket/prefer-undefined-over-null')
    assert.ok(
      idxInclusive < idxNoPlaceholders,
      'inclusive-language should come before no-placeholders',
    )
    assert.ok(
      idxNoPlaceholders < idxPreferUndefined,
      'no-placeholders should come before prefer-undefined-over-null',
    )
  })

  test('skips rules without guidance, keeps those with guidance', () => {
    const findings = [makeMsg('socket/unknown-xyz'), makeMsg(HANDLED_RULE)]
    const out = renderRuleGuidance(findings)
    assert.ok(out.includes(HANDLED_RULE))
    assert.ok(!out.includes('socket/unknown-xyz'))
  })

  test('returns empty string when all rules lack guidance', () => {
    const out = renderRuleGuidance([
      makeMsg('socket/no-such-rule-a'),
      makeMsg('socket/no-such-rule-b'),
    ])
    assert.equal(out, '')
  })
})

// ── buildPrompt ───────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  const absPath = path.join(process.cwd(), 'src', 'example.mts')
  const relPath = path.relative(process.cwd(), absPath)
  const findings: OxlintMessage[] = [
    makeMsg(HANDLED_RULE, 'use undefined not null', 42, 7),
  ]

  test('returns non-empty string', () => {
    const p = buildPrompt(absPath, findings)
    assert.ok(p.length > 0)
  })

  test('contains role, task, file, findings, process, constraints, reminders, output tags', () => {
    const p = buildPrompt(absPath, findings)
    for (const tag of [
      '<role>',
      '<task>',
      '<file>',
      '<findings>',
      '<process>',
      '<constraints>',
      '<reminders>',
      '<output>',
    ]) {
      assert.ok(p.includes(tag), `expected ${tag} in prompt`)
    }
  })

  test('embeds relative file path', () => {
    const p = buildPrompt(absPath, findings)
    assert.ok(
      p.includes(relPath),
      `expected relative path "${relPath}" in prompt`,
    )
  })

  test('embeds findings block', () => {
    const p = buildPrompt(absPath, findings)
    assert.ok(p.includes(`rule="${HANDLED_RULE}"`))
    assert.ok(p.includes('line="42"'))
    assert.ok(p.includes('column="7"'))
  })

  test('embeds rules guidance block when findings have known rules', () => {
    const p = buildPrompt(absPath, findings)
    assert.ok(p.includes('<rules>'), `expected <rules> block in prompt`)
    assert.ok(p.includes(`<rule id="${HANDLED_RULE}">`))
  })

  test('omits rules block when findings have no known guidance', () => {
    const unknownFindings: OxlintMessage[] = [makeMsg('socket/unknown-xyz')]
    const p = buildPrompt(absPath, unknownFindings)
    assert.ok(!p.includes('<rules>'), `expected no <rules> block in prompt`)
  })

  test('contains self-verify instruction referencing relative path', () => {
    const p = buildPrompt(absPath, findings)
    assert.ok(p.includes('SELF-VERIFY'), `expected SELF-VERIFY in prompt`)
    // Step 4 references the rel path twice
    const count = (
      p.match(new RegExp(relPath.replace(/\./g, '\\.'), 'g')) ?? []
    ).length
    assert.ok(
      count >= 2,
      `expected at least 2 occurrences of relative path, got ${count}`,
    )
  })

  test('output section requests specific format', () => {
    const p = buildPrompt(absPath, findings)
    assert.ok(
      p.includes('Fixed N findings'),
      `expected format string in output section`,
    )
  })
})
