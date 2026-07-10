// vitest spec for check-claude-md-rules-are-informative. The exported `audit`
// pure function is exercised directly with inline CLAUDE.md fixture strings —
// no real filesystem, git, or network access needed. Importing the check is
// side-effect-free because main() is entrypoint-guarded.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import { audit } from '../../../scripts/fleet/check/claude-md-rules-are-informative.mts'

// Wrap content in canonical fleet-block markers so audit() recognises it.
function inFleetBlock(body: string): string {
  return `<!-- <fleet-canonical> -->\n${body}\n<!-- </fleet-canonical> -->`
}

describe('audit — empty / no fleet block', () => {
  test('empty string → zero sections, no findings', () => {
    const result = audit('')
    assert.equal(result.totalSections, 0)
    assert.equal(result.enforcedSections, 0)
    assert.deepEqual(result.findings, [])
  })

  test('content outside fleet markers is ignored', () => {
    const result = audit('- pure prose bullet with no enforcer')
    assert.equal(result.totalSections, 0)
    assert.deepEqual(result.findings, [])
  })
})

describe('audit — PASS cases (anchored bullets)', () => {
  test('bullet with a hook citation passes', () => {
    const result = audit(
      inFleetBlock(
        '- Always lint via pnpm. (`.claude/hooks/fleet/no-other-linters-guard/`)',
      ),
    )
    assert.equal(result.totalSections, 1)
    assert.equal(result.enforcedSections, 1)
    assert.deepEqual(result.findings, [])
  })

  test('bullet with a docs link passes', () => {
    const result = audit(
      inFleetBlock(
        '- See the detail file. [`topic`](docs/agents.md/fleet/topic.md)',
      ),
    )
    assert.equal(result.totalSections, 1)
    assert.equal(result.enforcedSections, 1)
    assert.deepEqual(result.findings, [])
  })

  test('bullet with a skill reference passes', () => {
    const result = audit(
      inFleetBlock(
        '- Run the prose skill before landing. `.claude/skills/fleet/prose/SKILL.md`',
      ),
    )
    assert.equal(result.totalSections, 1)
    assert.equal(result.enforcedSections, 1)
    assert.deepEqual(result.findings, [])
  })

  test('bullet with advisory opt-out (inline) passes', () => {
    const result = audit(
      inFleetBlock('- Soft norm only. (advisory, no enforcement)'),
    )
    assert.equal(result.totalSections, 1)
    assert.equal(result.enforcedSections, 1)
    assert.deepEqual(result.findings, [])
  })

  test('bullet with advisory opt-out (HTML comment) passes', () => {
    const result = audit(inFleetBlock('- Another soft norm. <!--advisory-->'))
    assert.equal(result.totalSections, 1)
    assert.equal(result.enforcedSections, 1)
    assert.deepEqual(result.findings, [])
  })

  test('multiple anchored bullets → no findings', () => {
    const body = [
      '- Rule A. (`.claude/hooks/fleet/guard-a/`)',
      '- Rule B. [`detail`](docs/agents.md/fleet/detail.md)',
      '- Rule C. (advisory, no enforcement)',
    ].join('\n')
    const result = audit(inFleetBlock(body))
    assert.equal(result.totalSections, 3)
    assert.equal(result.enforcedSections, 3)
    assert.deepEqual(result.findings, [])
  })
})

describe('audit — FAIL cases (pure-prose bullets)', () => {
  test('bullet with no anchor → one finding', () => {
    const result = audit(inFleetBlock('- Pure prose, no enforcer here.'))
    assert.equal(result.totalSections, 1)
    assert.equal(result.enforcedSections, 0)
    assert.equal(result.findings.length, 1)
    assert.match(result.findings[0]!.heading, /Pure prose/)
  })

  test('finding line number is 1-indexed correctly', () => {
    // fleet-begin is line 1, body bullet is line 2
    const result = audit(inFleetBlock('- Unenforced rule.'))
    assert.equal(result.findings[0]!.line, 2)
  })

  test('heading is truncated to 60 characters', () => {
    const longRule = 'A'.repeat(80)
    const result = audit(inFleetBlock(`- ${longRule}`))
    assert.equal(result.findings[0]!.heading.length, 60)
  })

  test('mixed bullets: some pass, one fails', () => {
    const body = [
      '- Good rule. (`.claude/hooks/fleet/some-guard/`)',
      '- Bad rule with no enforcer at all.',
      '- Also good. [`detail`](docs/agents.md/fleet/x.md)',
    ].join('\n')
    const result = audit(inFleetBlock(body))
    assert.equal(result.totalSections, 3)
    assert.equal(result.enforcedSections, 2)
    assert.equal(result.findings.length, 1)
    assert.match(result.findings[0]!.heading, /Bad rule/)
  })
})

describe('audit — non-bullet lines are ignored', () => {
  test('## headings inside fleet block are not counted as bullets', () => {
    const body = [
      '## 📚 Fleet',
      '',
      '- Real rule. (`.claude/hooks/fleet/guard/`)',
    ].join('\n')
    const result = audit(inFleetBlock(body))
    assert.equal(result.totalSections, 1)
    assert.equal(result.enforcedSections, 1)
  })

  test('indented sub-bullets are not top-level rule bullets', () => {
    // Leading spaces → not matched by /^- /
    const body = [
      '- Top-level rule. (`.claude/hooks/fleet/guard/`)',
      '  - indented detail, no anchor',
    ].join('\n')
    const result = audit(inFleetBlock(body))
    assert.equal(result.totalSections, 1)
    assert.equal(result.findings.length, 0)
  })

  test('prose paragraphs are not counted', () => {
    const body = 'Just a prose paragraph with no bullet prefix.'
    const result = audit(inFleetBlock(body))
    assert.equal(result.totalSections, 0)
    assert.deepEqual(result.findings, [])
  })
})

describe('audit — legacy BEGIN/END markers also recognised', () => {
  test('BEGIN <fleet-canonical> / END </fleet-canonical> markers delimit the block', () => {
    const content = [
      '<!-- BEGIN <fleet-canonical> -->',
      '- Unenforced bullet.',
      '<!-- END </fleet-canonical> -->',
    ].join('\n')
    const result = audit(content)
    assert.equal(result.totalSections, 1)
    assert.equal(result.findings.length, 1)
  })
})
