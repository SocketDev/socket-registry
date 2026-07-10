// vitest spec for normalizeOxlintJson — the pure diagnostic-normalization
// core of the ai-lint-fix oxlint-json layer. The IO runner (runLintJson) is
// not tested here (spawn / fs concerns).

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import { normalizeOxlintJson } from '../../../scripts/fleet/ai-lint-fix/oxlint-json.mts'

import type {
  OxlintDiagnostic,
  OxlintJsonOutput,
} from '../../../scripts/fleet/ai-lint-fix/oxlint-json.mts'

function makeDiagnostic(
  overrides: Partial<OxlintDiagnostic> & {
    labels?: OxlintDiagnostic['labels'] | undefined
  } = {},
): OxlintDiagnostic {
  return {
    code: 'socket(prefer-async-spawn)',
    filename: 'src/index.mts',
    message: 'use async spawn',
    severity: 'error',
    labels: [{ span: { offset: 0, length: 10, line: 1, column: 1 } }],
    ...overrides,
  }
}

function payload(diagnostics: OxlintDiagnostic[]): OxlintJsonOutput {
  return { diagnostics }
}

describe('normalizeOxlintJson — empty / skip cases', () => {
  test('empty diagnostics → empty array', () => {
    assert.deepEqual(normalizeOxlintJson(payload([])), [])
  })

  test('diagnostic with no labels is skipped', () => {
    const d = makeDiagnostic({ labels: [] })
    assert.deepEqual(normalizeOxlintJson(payload([d])), [])
  })

  test('all diagnostics with no labels → empty array', () => {
    const d1 = makeDiagnostic({ labels: [], filename: 'a.mts' })
    const d2 = makeDiagnostic({ labels: [], filename: 'b.mts' })
    assert.deepEqual(normalizeOxlintJson(payload([d1, d2])), [])
  })
})

describe('normalizeOxlintJson — ruleId normalization', () => {
  test('socket(rule-id) → socket/rule-id', () => {
    const d = makeDiagnostic({ code: 'socket(prefer-async-spawn)' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.ruleId, 'socket/prefer-async-spawn')
  })

  test('eslint(no-unused-vars) → eslint/no-unused-vars', () => {
    const d = makeDiagnostic({ code: 'eslint(no-unused-vars)' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.ruleId, 'eslint/no-unused-vars')
  })

  test('code without parens is kept as-is', () => {
    const d = makeDiagnostic({ code: 'no-unused-vars' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.ruleId, 'no-unused-vars')
  })

  test('empty-string code without parens is kept as-is', () => {
    const d = makeDiagnostic({ code: '' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.ruleId, '')
  })
})

describe('normalizeOxlintJson — severity mapping', () => {
  test('severity "error" → 2', () => {
    const d = makeDiagnostic({ severity: 'error' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.severity, 2)
  })

  test('severity "warning" → 1', () => {
    const d = makeDiagnostic({ severity: 'warning' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.severity, 1)
  })

  test('unknown severity string → 1 (non-"error" fallback)', () => {
    const d = makeDiagnostic({ severity: 'info' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.severity, 1)
  })
})

describe('normalizeOxlintJson — span → line/column', () => {
  test('line and column are taken from labels[0].span', () => {
    const d = makeDiagnostic({
      labels: [{ span: { offset: 42, length: 5, line: 7, column: 13 } }],
    })
    const result = normalizeOxlintJson(payload([d]))
    const msg = result[0]?.messages[0]
    assert.equal(msg?.line, 7)
    assert.equal(msg?.column, 13)
  })

  test('only the first label is used; a second label is ignored', () => {
    const d = makeDiagnostic({
      labels: [
        { span: { offset: 0, length: 1, line: 3, column: 5 } },
        { span: { offset: 99, length: 1, line: 99, column: 99 } },
      ],
    })
    const result = normalizeOxlintJson(payload([d]))
    const msg = result[0]?.messages[0]
    assert.equal(msg?.line, 3)
    assert.equal(msg?.column, 5)
  })
})

describe('normalizeOxlintJson — message passthrough', () => {
  test('message string is copied verbatim', () => {
    const d = makeDiagnostic({ message: 'prefer async spawn over exec' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(
      result[0]?.messages[0]?.message,
      'prefer async spawn over exec',
    )
  })
})

describe('normalizeOxlintJson — file grouping', () => {
  test('two diagnostics for the same file → one OxlintFile with two messages', () => {
    const d1 = makeDiagnostic({ filename: 'src/a.mts', message: 'first' })
    const d2 = makeDiagnostic({
      filename: 'src/a.mts',
      message: 'second',
      labels: [{ span: { offset: 5, length: 3, line: 2, column: 4 } }],
    })
    const result = normalizeOxlintJson(payload([d1, d2]))
    assert.equal(result.length, 1)
    assert.equal(result[0]?.filePath, 'src/a.mts')
    assert.equal(result[0]?.messages.length, 2)
    assert.equal(result[0]?.messages[0]?.message, 'first')
    assert.equal(result[0]?.messages[1]?.message, 'second')
  })

  test('diagnostics for different files → separate OxlintFile entries', () => {
    const d1 = makeDiagnostic({ filename: 'src/a.mts' })
    const d2 = makeDiagnostic({ filename: 'src/b.mts' })
    const result = normalizeOxlintJson(payload([d1, d2]))
    assert.equal(result.length, 2)
    const paths = result.map(f => f.filePath).toSorted()
    assert.deepEqual(paths, ['src/a.mts', 'src/b.mts'])
  })

  test('filePath on each OxlintFile matches the diagnostic filename', () => {
    const d = makeDiagnostic({ filename: 'scripts/fleet/foo.mts' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.filePath, 'scripts/fleet/foo.mts')
  })

  test('skipped (no-label) diagnostic does not create a file entry for its filename', () => {
    const dSkipped = makeDiagnostic({ filename: 'src/a.mts', labels: [] })
    const dKept = makeDiagnostic({ filename: 'src/b.mts' })
    const result = normalizeOxlintJson(payload([dSkipped, dKept]))
    assert.equal(result.length, 1)
    assert.equal(result[0]?.filePath, 'src/b.mts')
  })

  test('mixed: skip + keep for same filename → only kept messages appear', () => {
    const dSkipped = makeDiagnostic({
      filename: 'src/a.mts',
      labels: [],
      message: 'skipped',
    })
    const dKept = makeDiagnostic({
      filename: 'src/a.mts',
      message: 'kept',
    })
    const result = normalizeOxlintJson(payload([dSkipped, dKept]))
    assert.equal(result.length, 1)
    assert.equal(result[0]?.messages.length, 1)
    assert.equal(result[0]?.messages[0]?.message, 'kept')
  })
})

describe('normalizeOxlintJson — ruleId regex edge cases', () => {
  test('plugin name with hyphens: typescript(no-explicit-any) → typescript/no-explicit-any', () => {
    const d = makeDiagnostic({ code: 'typescript(no-explicit-any)' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.ruleId, 'typescript/no-explicit-any')
  })

  test('code with trailing text after closing paren uses only plugin+rule portion', () => {
    // The regex `^([^(]+)\(([^)]+)\).*$` strips everything after `)`.
    const d = makeDiagnostic({ code: 'eslint(no-var) extra' })
    const result = normalizeOxlintJson(payload([d]))
    assert.equal(result[0]?.messages[0]?.ruleId, 'eslint/no-var')
  })
})
