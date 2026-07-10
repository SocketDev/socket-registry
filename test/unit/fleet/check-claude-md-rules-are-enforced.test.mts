// vitest specs for the code-is-law coverage gate (claude-md-rules-are-enforced).
// Exercises both arms (a 🚨 rule with a resolving enforcer passes; one with none
// fails) and every branch: each enforcer kind (hook/socket/typescript/script),
// brace expansion, the section + detail-doc + SKILL-link fallbacks, each opt-out
// category, non-🚨 paragraphs ignored, fleet-block scoping, plugin-absent
// fail-open, and malformed input.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  auditFile,
  expandNames,
  linkedDetailDocs,
  optOutCategory,
  paragraphIsEnforced,
  sirenParagraphs,
  textCitesEnforcer,
} from '../../../scripts/fleet/check/claude-md-rules-are-enforced.mts'
import type { EnforcerInventory } from '../../../scripts/fleet/check/claude-md-rules-are-enforced.mts'

const SIREN = '🚨'

function inv(over: Partial<EnforcerInventory> = {}): EnforcerInventory {
  return {
    hookNames: new Set(['a-guard', 'b-guard', 'installer-hook', 'my-guard']),
    socketRules: new Set(['my-rule']),
    tsRules: new Set(['no-explicit-any']),
    scriptPaths: new Set(['fleet/check/foo.mts', 'repo/cascade-fleet.mts']),
    ...over,
  }
}

const noDoc = (): undefined => undefined

// ── expandNames ─────────────────────────────────────────────────

test('expandNames expands a brace group and passes a bare name through', () => {
  assert.deepEqual(expandNames('{a-guard,b-guard}'), ['a-guard', 'b-guard'])
  assert.deepEqual(expandNames('my-guard'), ['my-guard'])
  // whitespace inside the brace group is trimmed; empties dropped
  assert.deepEqual(expandNames('{ a-guard , b-guard }'), ['a-guard', 'b-guard'])
})

// ── textCitesEnforcer: each arm ─────────────────────────────────

test('textCitesEnforcer matches a resolving hook citation', () => {
  assert.equal(
    textCitesEnforcer('blah (`.claude/hooks/fleet/my-guard/`)', inv()),
    true,
  )
})

test('textCitesEnforcer matches a repo-segment hook too', () => {
  assert.equal(
    textCitesEnforcer('see `.claude/hooks/repo/my-guard/`', inv()),
    true,
  )
})

test('textCitesEnforcer expands a brace-grouped hook citation', () => {
  assert.equal(
    textCitesEnforcer('`.claude/hooks/fleet/{a-guard,b-guard}/`', inv()),
    true,
  )
})

test('textCitesEnforcer does NOT match a hook that is not in the inventory', () => {
  assert.equal(
    textCitesEnforcer('`.claude/hooks/fleet/ghost-guard/`', inv()),
    false,
  )
})

test('textCitesEnforcer matches a registered socket/ rule', () => {
  assert.equal(textCitesEnforcer('enforced by `socket/my-rule`', inv()), true)
})

test('textCitesEnforcer does NOT match an unregistered socket/ rule', () => {
  assert.equal(textCitesEnforcer('`socket/ghost-rule`', inv()), false)
})

test('textCitesEnforcer matches a typescript/ config rule', () => {
  assert.equal(
    textCitesEnforcer('`typescript/no-explicit-any` is error', inv()),
    true,
  )
})

test('textCitesEnforcer matches a resolving scripts/ path (fleet and repo tiers)', () => {
  assert.equal(
    textCitesEnforcer('run `scripts/fleet/check/foo.mts`', inv()),
    true,
  )
  assert.equal(
    textCitesEnforcer(
      'socket-wheelhouse/scripts/repo/cascade-fleet.mts',
      inv(),
    ),
    true,
  )
})

test('textCitesEnforcer does NOT match a non-resolving scripts/ path', () => {
  assert.equal(textCitesEnforcer('`scripts/fleet/gone.mts`', inv()), false)
})

test('textCitesEnforcer returns false for plain prose with no citation', () => {
  assert.equal(textCitesEnforcer('just be careful, please', inv()), false)
})

// ── plugin-absent fail-open ─────────────────────────────────────

test('a socket/ citation passes when the plugin is absent (socketRules empty)', () => {
  // In a repo that does not ship the plugin, the socket arm fails open so a
  // valid rule that simply can't be verified here is not a false failure.
  assert.equal(
    textCitesEnforcer('`socket/anything`', inv({ socketRules: new Set() })),
    true,
  )
})

// ── installer-hook arm (off-machine enforcement) ────────────────

test('an installer hook (install.mts, no index.mts) counts as an enforcer', () => {
  // collectHookEnforcers adds names with index.mts OR install.mts; the inventory
  // here includes installer-hook, so a citation to it resolves.
  assert.equal(
    textCitesEnforcer('`.claude/hooks/fleet/installer-hook/`', inv()),
    true,
  )
})

// ── linkedDetailDocs ────────────────────────────────────────────

test('linkedDetailDocs captures fleet doc links and SKILL.md links', () => {
  const text = [
    'see [tooling](docs/agents.md/fleet/tooling.md) for detail',
    'and `.claude/skills/fleet/locking-down-claude/SKILL.md`',
  ].join('\n')
  assert.deepEqual(linkedDetailDocs(text).toSorted(), [
    '.claude/skills/fleet/locking-down-claude/SKILL.md',
    'docs/agents.md/fleet/tooling.md',
  ])
})

test('linkedDetailDocs ignores non-fleet docs links', () => {
  assert.deepEqual(
    linkedDetailDocs('[x](docs/agents.md/wheelhouse/x.md) [y](README.md)'),
    [],
  )
})

// ── paragraphIsEnforced: section + detail-doc fallback ──────────

test('paragraphIsEnforced passes when the SECTION (not the paragraph) cites an enforcer', () => {
  const para = `${SIREN} the rule with no inline cite`
  const section = `### Topic\n\n${para}\n\nFull ruleset (\`.claude/hooks/fleet/my-guard/\`).`
  assert.equal(paragraphIsEnforced(section, inv(), noDoc), true)
})

test('paragraphIsEnforced passes when a linked detail doc cites an enforcer', () => {
  const para = `${SIREN} rule [detail](docs/agents.md/fleet/topic.md)`
  const readDoc = (rel: string): string | undefined =>
    rel === 'docs/agents.md/fleet/topic.md'
      ? 'enforced by `socket/my-rule`'
      : undefined
  assert.equal(paragraphIsEnforced(para, inv(), readDoc), true)
})

test('paragraphIsEnforced passes when a linked SKILL.md cites an enforcer', () => {
  const para = `${SIREN} see \`.claude/skills/fleet/x/SKILL.md\``
  const readDoc = (rel: string): string | undefined =>
    rel === '.claude/skills/fleet/x/SKILL.md'
      ? 'enforced at edit time by `.claude/hooks/fleet/my-guard/`'
      : undefined
  assert.equal(paragraphIsEnforced(para, inv(), readDoc), true)
})

test('paragraphIsEnforced FAILS when neither paragraph, section, nor doc cites an enforcer', () => {
  const para = `${SIREN} a hard rule with only a prose detail link [d](docs/agents.md/fleet/topic.md)`
  const readDoc = (): string => 'this detail page is pure prose, no enforcer'
  assert.equal(paragraphIsEnforced(para, inv(), readDoc), false)
})

test('paragraphIsEnforced FAILS when a linked doc is missing (readDoc undefined)', () => {
  const para = `${SIREN} rule [gone](docs/agents.md/fleet/missing.md)`
  assert.equal(paragraphIsEnforced(para, inv(), noDoc), false)
})

// ── optOutCategory ──────────────────────────────────────────────

test('optOutCategory recognizes each allowed category with an em-dash or hyphen separator', () => {
  assert.equal(
    optOutCategory('<!-- enforcement: human-review — judgment call -->'),
    'human-review',
  )
  assert.equal(
    optOutCategory(
      '<!-- enforcement: off-machine - GitHub required_signatures -->',
    ),
    'off-machine',
  )
  assert.equal(
    optOutCategory('<!-- enforcement: installer — host keychain setup -->'),
    'installer',
  )
})

test('optOutCategory rejects a bare category with no reason', () => {
  assert.equal(optOutCategory('<!-- enforcement: human-review -->'), undefined)
})

test('optOutCategory rejects an unknown category', () => {
  assert.equal(
    optOutCategory('<!-- enforcement: vibes — trust me -->'),
    undefined,
  )
})

// ── sirenParagraphs: scoping + section attachment ───────────────

test('sirenParagraphs returns only 🚨 paragraphs and reports the first line', () => {
  const body = [
    'line one no siren', // 1
    '', // 2
    `${SIREN} rule A`, // 3
    'continued A', // 4
    '', // 5
    'a non-siren paragraph', // 6
  ].join('\n')
  const paras = sirenParagraphs('f.md', body, { fleetOnly: false })
  assert.equal(paras.length, 1)
  assert.equal(paras[0]!.line, 3)
  assert.match(paras[0]!.text, /rule A/)
})

test('sirenParagraphs attaches the enclosing ### section text', () => {
  const body = [
    '### Topic', // 1
    '', // 2
    `${SIREN} rule`, // 3
    '', // 4
    'Detail: [t](docs/agents.md/fleet/t.md)', // 5
  ].join('\n')
  const paras = sirenParagraphs('CLAUDE.md', body, { fleetOnly: false })
  assert.equal(paras.length, 1)
  assert.match(paras[0]!.sectionText, /### Topic/)
  assert.match(paras[0]!.sectionText, /docs\/agents\.md\/fleet\/t\.md/)
})

test('sirenParagraphs with fleetOnly ignores 🚨 outside the FLEET-CANONICAL block', () => {
  const body = [
    `${SIREN} preamble rule outside the block`,
    '<!-- <fleet-canonical> -->',
    `- ${SIREN} in-block rule`,
    '<!-- </fleet-canonical> -->',
    `${SIREN} postamble rule outside the block`,
  ].join('\n')
  const paras = sirenParagraphs('CLAUDE.md', body, { fleetOnly: true })
  assert.equal(paras.length, 1)
  assert.match(paras[0]!.text, /in-block rule/)
})

// ── auditFile: end-to-end both arms + opt-out routing ───────────

test('auditFile reports an unenforced 🚨 rule as a finding', () => {
  const body = `### Topic\n\n${SIREN} unenforced hard rule\n`
  const r = auditFile('CLAUDE.md', body, inv(), {
    fleetOnly: false,
    readDoc: noDoc,
  })
  assert.equal(r.findings.length, 1)
  assert.equal(r.optOuts.length, 0)
  assert.equal(r.checked, 1)
  assert.equal(r.findings[0]!.line, 3)
})

test('auditFile passes an enforced 🚨 rule (no finding)', () => {
  const body = `### Topic\n\n${SIREN} rule (\`.claude/hooks/fleet/my-guard/\`)\n`
  const r = auditFile('CLAUDE.md', body, inv(), {
    fleetOnly: false,
    readDoc: noDoc,
  })
  assert.equal(r.findings.length, 0)
  assert.equal(r.checked, 1)
})

test('auditFile routes an opted-out 🚨 rule to optOuts, not findings', () => {
  const body = `### Topic\n\n${SIREN} cannot be coded\n<!-- enforcement: human-review — judgment -->\n`
  const r = auditFile('CLAUDE.md', body, inv(), {
    fleetOnly: false,
    readDoc: noDoc,
  })
  assert.equal(r.findings.length, 0)
  assert.equal(r.optOuts.length, 1)
  assert.equal(r.optOuts[0]!.category, 'human-review')
})

test('auditFile ignores non-🚨 paragraphs entirely', () => {
  const body = '### Topic\n\nan ordinary rule with no siren, no enforcer\n'
  const r = auditFile('CLAUDE.md', body, inv(), {
    fleetOnly: false,
    readDoc: noDoc,
  })
  assert.equal(r.findings.length, 0)
  assert.equal(r.checked, 0)
})

test('auditFile (fleetOnly bullets) enforces 🚨 bullets via their inline citation', () => {
  // The thin CLAUDE.md is a bullet index; each 🚨 `- ` bullet is a rule whose
  // enforcer citation rides on the same line. One enforced, one not.
  const body = [
    '<!-- <fleet-canonical> -->',
    '## 📚 Fleet',
    `- ${SIREN} enforced bullet (\`.claude/hooks/fleet/my-guard/\`)`,
    `- ${SIREN} unenforced bullet with no anchor`,
    '<!-- </fleet-canonical> -->',
  ].join('\n')
  const r = auditFile('CLAUDE.md', body, inv(), {
    fleetOnly: true,
    readDoc: noDoc,
  })
  assert.equal(r.checked, 2)
  assert.equal(r.findings.length, 1)
  assert.match(r.findings[0]!.excerpt, /unenforced bullet/)
})

test('auditFile is fail-open on empty input', () => {
  const r = auditFile('CLAUDE.md', '', inv(), {
    fleetOnly: true,
    readDoc: noDoc,
  })
  assert.deepEqual([r.findings.length, r.optOuts.length, r.checked], [0, 0, 0])
})
