// vitest spec for check-mutating-skills-have-model. The three exported pure
// functions (frontmatter, isMutating, hasModel) are exercised with inline
// fixtures; no git/gh/network calls are needed. Importing the check triggers
// main() at module scope (the check is not entrypoint-guarded), but main()
// only scans the real .claude/skills/fleet tree — it does not mutate state
// visible to these tests and exits clean when every live skill is compliant.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  frontmatter,
  hasModel,
  isMutating,
} from '../../../scripts/fleet/check/mutating-skills-have-model.mts'

// ---------------------------------------------------------------------------
// frontmatter
// ---------------------------------------------------------------------------

describe('frontmatter', () => {
  test('returns the YAML block between the first two --- lines', () => {
    const md = [
      '---',
      'name: my-skill',
      'allowed-tools: Edit, Bash',
      '---',
      '',
      '# Body',
    ].join('\n')
    assert.equal(frontmatter(md), 'name: my-skill\nallowed-tools: Edit, Bash')
  })

  test('returns undefined when there is no opening ---', () => {
    assert.equal(frontmatter('name: x\nallowed-tools: Edit'), undefined)
  })

  test('returns undefined when the closing --- is absent', () => {
    const md = '---\nname: x\nallowed-tools: Edit'
    assert.equal(frontmatter(md), undefined)
  })

  test('returns empty string for an empty frontmatter block', () => {
    const md = '---\n---\n# Body'
    assert.equal(frontmatter(md), '')
  })
})

// ---------------------------------------------------------------------------
// isMutating
// ---------------------------------------------------------------------------

describe('isMutating', () => {
  test('Edit in allowed-tools → mutating', () => {
    assert.equal(isMutating('allowed-tools: Edit, Bash'), true)
  })

  test('Write in allowed-tools → mutating', () => {
    assert.equal(isMutating('allowed-tools: Bash, Write'), true)
  })

  test('NotebookEdit in allowed-tools → mutating', () => {
    assert.equal(isMutating('allowed-tools: NotebookEdit'), true)
  })

  test('git commit in allowed-tools → mutating', () => {
    assert.equal(isMutating('allowed-tools: Bash(git commit)'), true)
  })

  test('git add in allowed-tools → mutating', () => {
    assert.equal(isMutating('allowed-tools: Bash(git add)'), true)
  })

  test('read-only tools only → not mutating', () => {
    assert.equal(isMutating('allowed-tools: Bash, Read'), false)
  })

  test('no allowed-tools line → not mutating', () => {
    assert.equal(isMutating('name: scan-skill\nmodel: claude-haiku-4-5'), false)
  })

  test('allowed-tools value contains "editor" (not "Edit") → not mutating', () => {
    assert.equal(isMutating('allowed-tools: editor-tool, Bash'), false)
  })
})

// ---------------------------------------------------------------------------
// hasModel
// ---------------------------------------------------------------------------

describe('hasModel', () => {
  test('model: with a value → true', () => {
    assert.equal(hasModel('model: claude-haiku-4-5'), true)
  })

  test('model: followed only by whitespace → false', () => {
    assert.equal(hasModel('model:   '), false)
  })

  test('no model line → false', () => {
    assert.equal(hasModel('name: x\nallowed-tools: Edit'), false)
  })

  test('model appears in a multi-line block', () => {
    const fm = [
      'name: fix-skill',
      'allowed-tools: Edit',
      'model: claude-sonnet-4-5',
    ].join('\n')
    assert.equal(hasModel(fm), true)
  })
})

// ---------------------------------------------------------------------------
// combined: compliant vs non-compliant skill frontmatter
// ---------------------------------------------------------------------------

describe('mutating skill compliance', () => {
  test('PASS: mutating skill that declares model is compliant', () => {
    const md = [
      '---',
      'name: fix-lint',
      'allowed-tools: Edit, Bash',
      'model: claude-haiku-4-5',
      'context: fork',
      '---',
      '',
      '# Fix Lint',
    ].join('\n')
    const fm = frontmatter(md)
    assert.ok(fm !== undefined)
    assert.equal(isMutating(fm!), true)
    assert.equal(hasModel(fm!), true)
  })

  test('FAIL: mutating skill missing model is a violation', () => {
    const md = [
      '---',
      'name: fix-lint',
      'allowed-tools: Edit, Bash',
      '---',
      '',
      '# Fix Lint',
    ].join('\n')
    const fm = frontmatter(md)
    assert.ok(fm !== undefined)
    assert.equal(isMutating(fm!), true)
    assert.equal(hasModel(fm!), false)
  })

  test('PASS: read-only skill without model is not a violation', () => {
    const md = [
      '---',
      'name: scan-audit',
      'allowed-tools: Bash, Read',
      '---',
      '',
      '# Scan',
    ].join('\n')
    const fm = frontmatter(md)
    assert.ok(fm !== undefined)
    assert.equal(isMutating(fm!), false)
  })

  test('PASS: skill with no frontmatter at all is skipped', () => {
    const md = '# No Frontmatter\n\nJust a body.'
    assert.equal(frontmatter(md), undefined)
  })
})
