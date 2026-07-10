// vitest specs for the three pure parser exports in scripts/fleet/security.mts:
//   parseZizmorJson        — native zizmor --format json array → Finding[]
//   parseAgentshieldOutput — agentshield text heuristic → Finding[]
//   parseSkillscannerOutput — skillscanner text heuristic → Finding[]
// No live tools or network: all parsers are tested against captured / representative
// sample strings. The zizmor sample is derived from a real `zizmor --format json
// --persona auditor .github/` run on this repo; the other two are representative
// samples matching the documented agentshield/skillscanner text output patterns.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  parseAgentshieldOutput,
  parseSkillscannerOutput,
  parseZizmorJson,
} from '../../../scripts/fleet/security.mts'

// ─── zizmor ──────────────────────────────────────────────────────────────────

// Minimal subset of a real `zizmor --format json` array (two findings).
const ZIZMOR_SAMPLE = JSON.stringify([
  {
    ident: 'template-injection',
    desc: 'code injection via template expansion',
    url: 'https://docs.zizmor.sh/audits/#template-injection',
    determinations: {
      confidence: 'High',
      severity: 'Low',
      persona: 'Pedantic',
    },
    locations: [
      {
        symbolic: {
          key: {
            Local: {
              prefix: '.github/',
              given_path: '.github/actions/github-pr-app-token/action.yml',
            },
          },
          annotation: 'this step',
          route: { route: [{ Key: 'runs' }, { Key: 'steps' }, { Index: 0 }] },
          feature_kind: 'Normal',
          kind: 'Hidden',
        },
        concrete: {
          location: {
            start_point: { row: 37, column: 6 },
            end_point: { row: 46, column: 0 },
            offset_span: { start: 1502, end: 1911 },
          },
          feature: 'id: app-token',
          comments: [],
        },
      },
      {
        symbolic: {
          key: {
            Local: {
              prefix: '.github/',
              given_path: '.github/actions/github-pr-app-token/action.yml',
            },
          },
          annotation: 'may expand into attacker-controllable code',
          route: {
            route: [
              { Key: 'runs' },
              { Key: 'steps' },
              { Index: 0 },
              { Key: 'run' },
            ],
          },
          feature_kind: {
            Subfeature: { after: 6, fragment: { Raw: 'github.action_path' } },
          },
          kind: 'Primary',
        },
        concrete: {
          location: {
            start_point: { row: 45, column: 21 },
            end_point: { row: 45, column: 39 },
            offset_span: { start: 1856, end: 1874 },
          },
          feature:
            'node "${{ github.action_path }}/mint-app-installation-token.mjs"',
          comments: [],
        },
      },
    ],
    ignored: false,
  },
  {
    ident: 'anonymous-definition',
    desc: 'workflow or action definition without a name',
    url: 'https://docs.zizmor.sh/audits/#anonymous-definition',
    determinations: {
      confidence: 'High',
      severity: 'Informational',
      persona: 'Pedantic',
    },
    locations: [
      {
        symbolic: {
          key: {
            Local: {
              prefix: '.github/',
              given_path: '.github/workflows/release-bundle.yml',
            },
          },
          annotation: 'this job',
          route: { route: [{ Key: 'jobs' }, { Key: 'release-bundle' }] },
          feature_kind: 'KeyOnly',
          kind: 'Primary',
        },
        concrete: {
          location: {
            start_point: { row: 33, column: 2 },
            end_point: { row: 33, column: 16 },
            offset_span: { start: 1149, end: 1163 },
          },
          feature: 'release-bundle',
          comments: [],
        },
      },
    ],
    ignored: false,
  },
  // An ignored finding — must be dropped.
  {
    ident: 'ignored-rule',
    desc: 'should not appear',
    url: '',
    determinations: { confidence: 'Low', severity: 'Low', persona: 'Regular' },
    locations: [],
    ignored: true,
  },
])

describe('parseZizmorJson', () => {
  test('returns one Finding per non-ignored entry', () => {
    const findings = parseZizmorJson(ZIZMOR_SAMPLE)
    assert.equal(findings.length, 2)
  })

  test('all findings carry tool: "zizmor"', () => {
    const findings = parseZizmorJson(ZIZMOR_SAMPLE)
    assert.ok(findings.every(f => f.tool === 'zizmor'))
  })

  test('picks the Primary location for file+line', () => {
    const findings = parseZizmorJson(ZIZMOR_SAMPLE)
    const first = findings[0]
    assert.equal(first?.file, '.github/actions/github-pr-app-token/action.yml')
    // Primary location row is 45 (0-indexed) → line 46
    assert.equal(first?.line, 46)
  })

  test('uses Primary location when present (second finding has one location tagged Primary)', () => {
    const findings = parseZizmorJson(ZIZMOR_SAMPLE)
    const second = findings[1]
    assert.equal(second?.file, '.github/workflows/release-bundle.yml')
    assert.equal(second?.line, 34)
  })

  test('falls back to first location when no Primary exists', () => {
    const noPrimary = JSON.stringify([
      {
        ident: 'no-primary-rule',
        desc: 'a finding with no Primary location',
        url: '',
        determinations: {
          confidence: 'High',
          severity: 'Medium',
          persona: 'Regular',
        },
        locations: [
          {
            symbolic: {
              key: {
                Local: {
                  prefix: '.github/',
                  given_path: '.github/workflows/ci.yml',
                },
              },
              annotation: 'first location',
              route: { route: [] },
              feature_kind: 'Normal',
              kind: 'Hidden',
            },
            concrete: {
              location: {
                start_point: { row: 9, column: 0 },
                end_point: { row: 9, column: 10 },
                offset_span: { start: 100, end: 110 },
              },
              feature: 'name',
              comments: [],
            },
          },
        ],
        ignored: false,
      },
    ])
    const findings = parseZizmorJson(noPrimary)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.file, '.github/workflows/ci.yml')
    assert.equal(findings[0]?.line, 10)
    assert.equal(findings[0]?.rule, 'no-primary-rule')
    assert.equal(findings[0]?.severity, 'Medium')
  })

  test('maps ident to rule, desc to message, severity from determinations', () => {
    const findings = parseZizmorJson(ZIZMOR_SAMPLE)
    assert.equal(findings[0]?.rule, 'template-injection')
    assert.equal(findings[0]?.message, 'code injection via template expansion')
    assert.equal(findings[0]?.severity, 'Low')
    assert.equal(findings[1]?.severity, 'Informational')
  })

  test('ignored entries are dropped', () => {
    const findings = parseZizmorJson(ZIZMOR_SAMPLE)
    assert.ok(findings.every(f => f.rule !== 'ignored-rule'))
  })

  test('returns [] for invalid JSON', () => {
    assert.deepEqual(parseZizmorJson('not json'), [])
  })

  test('returns [] for a non-array JSON value', () => {
    assert.deepEqual(parseZizmorJson('{}'), [])
    assert.deepEqual(parseZizmorJson('"string"'), [])
  })

  test('returns [] for an empty array', () => {
    assert.deepEqual(parseZizmorJson('[]'), [])
  })
})

// ─── agentshield ─────────────────────────────────────────────────────────────

describe('parseAgentshieldOutput', () => {
  test('parses Pattern A: "Detected: HIGH — rule-id: message  file.yml:12"', () => {
    const findings = parseAgentshieldOutput(
      'Detected: HIGH — prompt-injection: user input echoed verbatim  .claude/CLAUDE.md:7',
    )
    assert.equal(findings.length, 1)
    const f = findings[0]
    assert.equal(f?.tool, 'agentshield')
    assert.equal(f?.severity, 'HIGH')
    assert.equal(f?.rule, 'prompt-injection')
    assert.equal(f?.message, 'user input echoed verbatim')
    assert.equal(f?.file, '.claude/CLAUDE.md')
    assert.equal(f?.line, 7)
  })

  test('parses Pattern A with ASCII hyphen separator', () => {
    const findings = parseAgentshieldOutput(
      'Detected: MEDIUM - leaked-secret: API key in plain text  config.yml:3',
    )
    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.severity, 'MEDIUM')
    assert.equal(findings[0]?.rule, 'leaked-secret')
  })

  test('parses Pattern B: "[severity] file:line: message"', () => {
    const findings = parseAgentshieldOutput(
      '[critical] .claude/settings.json:22: bypassPermissions is enabled',
    )
    assert.equal(findings.length, 1)
    const f = findings[0]
    assert.equal(f?.severity, 'critical')
    assert.equal(f?.file, '.claude/settings.json')
    assert.equal(f?.line, 22)
    assert.equal(f?.message, 'bypassPermissions is enabled')
    assert.equal(f?.tool, 'agentshield')
  })

  test('falls back to raw-line finding for unrecognized lines', () => {
    const findings = parseAgentshieldOutput('Scan complete. 0 issues.')
    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.message, 'Scan complete. 0 issues.')
    assert.equal(findings[0]?.tool, 'agentshield')
  })

  test('blank lines are skipped', () => {
    const findings = parseAgentshieldOutput('\n\n[high] f.yml:1: x\n\n')
    assert.equal(findings.length, 1)
  })

  test('returns [] for empty string', () => {
    assert.deepEqual(parseAgentshieldOutput(''), [])
  })

  test('parses multiple lines', () => {
    const text = [
      'Detected: HIGH — rule-a: first issue  a.yml:1',
      '[low] b.yml:5: second issue',
    ].join('\n')
    const findings = parseAgentshieldOutput(text)
    assert.equal(findings.length, 2)
    assert.equal(findings[0]?.rule, 'rule-a')
    assert.equal(findings[1]?.severity, 'low')
  })
})

// ─── skillscanner ─────────────────────────────────────────────────────────────

describe('parseSkillscannerOutput', () => {
  test('parses Pattern A: "[severity] file:line: message"', () => {
    const findings = parseSkillscannerOutput(
      '[high] .claude/skills/fleet/prose/SKILL.md:10: prompt injection vector detected',
    )
    assert.equal(findings.length, 1)
    const f = findings[0]
    assert.equal(f?.tool, 'skillscanner')
    assert.equal(f?.severity, 'high')
    assert.equal(f?.file, '.claude/skills/fleet/prose/SKILL.md')
    assert.equal(f?.line, 10)
    assert.equal(f?.message, 'prompt injection vector detected')
  })

  test('parses Pattern B: "FINDING rule in file: message"', () => {
    const findings = parseSkillscannerOutput(
      'FINDING overpermissive-tool in .claude/skills/fleet/security/SKILL.md: tool has write+execute permissions',
    )
    assert.equal(findings.length, 1)
    const f = findings[0]
    assert.equal(f?.tool, 'skillscanner')
    assert.equal(f?.rule, 'overpermissive-tool')
    assert.equal(f?.file, '.claude/skills/fleet/security/SKILL.md')
    assert.equal(f?.message, 'tool has write+execute permissions')
  })

  test('falls back to raw-line finding for unrecognized lines', () => {
    const findings = parseSkillscannerOutput('No findings.')
    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.message, 'No findings.')
    assert.equal(findings[0]?.tool, 'skillscanner')
  })

  test('blank lines are skipped', () => {
    const findings = parseSkillscannerOutput('\n\n[medium] x.md:3: y\n\n')
    assert.equal(findings.length, 1)
  })

  test('returns [] for empty string', () => {
    assert.deepEqual(parseSkillscannerOutput(''), [])
  })

  test('parses multiple lines', () => {
    const text = [
      '[high] skill-a.md:1: dangerous content',
      'FINDING leaked-token in skill-b.md: token visible in prompt',
    ].join('\n')
    const findings = parseSkillscannerOutput(text)
    assert.equal(findings.length, 2)
    assert.equal(findings[0]?.severity, 'high')
    assert.equal(findings[1]?.rule, 'leaked-token')
  })
})
