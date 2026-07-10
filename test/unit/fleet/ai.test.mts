import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type * as AiModule from '../../../scripts/fleet/lib/llms-txt/ai.mts'
import {
  parseSlotResponse,
  validateSlotContent,
} from '../../../scripts/fleet/lib/llms-txt/ai.mts'

// AI helpers are mocked — no live AI calls in tests (no-unmocked-ai-guard).
vi.mock(
  import('../../../scripts/fleet/lib/llms-txt/ai.mts'),
  async importOriginal => {
    const actual = await importOriginal<typeof AiModule>()
    return {
      ...actual,
      fillSlots: vi
        .fn()
        .mockResolvedValue({ slots: { summary: 'Mocked summary.' } }),
      hasClaudeCli: vi.fn().mockResolvedValue(false),
    }
  },
)

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'llms-txt-test-'))
})

afterEach(() => {
  rmSync(tmpDir, { force: true, recursive: true })
})

describe('parseSlotResponse', () => {
  test('returns parsed slots for valid JSON', () => {
    const raw = JSON.stringify({ slots: { summary: 'Hello.' } })
    const result = parseSlotResponse(raw, ['summary'])
    assert.ok(result !== undefined)
    assert.equal(result.slots['summary'], 'Hello.')
  })

  test('returns undefined for invalid JSON', () => {
    assert.equal(parseSlotResponse('not json', ['summary']), undefined)
  })

  test('returns undefined when a required id is missing', () => {
    const raw = JSON.stringify({ slots: { other: 'x' } })
    assert.equal(parseSlotResponse(raw, ['summary']), undefined)
  })

  test('strips unknown keys from output', () => {
    const raw = JSON.stringify({ slots: { summary: 'ok', unknown: 'drop me' } })
    const result = parseSlotResponse(raw, ['summary'])
    assert.ok(result !== undefined)
    expect(result.slots).not.toHaveProperty('unknown')
  })
})

describe('validateSlotContent', () => {
  test('passes valid slots', () => {
    const errors = validateSlotContent(
      { summary: 'Good text here.' },
      { summary: 280 },
    )
    assert.equal(errors.length, 0)
  })

  test('fails when newline present', () => {
    const errors = validateSlotContent(
      { summary: 'line1\nline2' },
      { summary: 280 },
    )
    assert.ok(errors.some(e => e.includes('newline')))
  })

  test('fails when char budget exceeded', () => {
    const errors = validateSlotContent(
      { summary: 'x'.repeat(300) },
      { summary: 280 },
    )
    assert.ok(errors.some(e => e.includes('budget')))
  })

  test('fails when URL pattern present', () => {
    const errors = validateSlotContent(
      { summary: 'see http://example.com' },
      { summary: 280 },
    )
    assert.ok(errors.some(e => e.includes('http')))
  })

  test('fails when file path pattern present', () => {
    const errors = validateSlotContent(
      { summary: 'see ./src/index.ts for details' },
      { summary: 280 },
    )
    assert.ok(errors.some(e => e.includes('./')))
  })
})
