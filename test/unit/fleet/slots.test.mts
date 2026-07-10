import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, test } from 'vitest'

import { buildSlots } from '../../../scripts/fleet/lib/llms-txt/slots.mts'
import type { RepoFacts } from '../../../scripts/fleet/lib/llms-txt/types.mts'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'llms-txt-test-'))
})

afterEach(() => {
  rmSync(tmpDir, { force: true, recursive: true })
})

const BASE_FACTS: RepoFacts = {
  layout: 'single-package',
  license: 'MIT',
  nodeFloor: '>=24',
  readmeLead: 'A library for building things.',
  repoName: 'my-repo',
  version: '1.2.3',
}

describe('buildSlots', () => {
  test('always includes summary slot', () => {
    const slots = buildSlots(BASE_FACTS, [])
    assert.ok(slots.some(s => s.id === 'summary'))
  })

  test('summary slot uses readmeLead as source', () => {
    const slots = buildSlots(BASE_FACTS, [])
    const summary = slots.find(s => s.id === 'summary')
    assert.ok(summary !== undefined)
    assert.equal(summary.source, BASE_FACTS.readmeLead)
  })
})
