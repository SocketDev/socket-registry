// vitest specs for cleaning-ci/lib/clean-ci — the read-only inventory's pure
// classifiers: which on-disk files are orphans, and which workflow records are
// delete-record candidates. The actual deletes stay model-driven (irreversible);
// the engine only flags candidates.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  findOrphanFiles,
  isStaleRecord,
} from '../../../.claude/skills/fleet/cleaning-ci/lib/clean-ci.mts'
import type { WorkflowRecord } from '../../../.claude/skills/fleet/cleaning-ci/lib/clean-ci.mts'

function fixtureRepo(files: readonly string[]): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cci-'))
  mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true })
  for (const f of files) {
    writeFileSync(path.join(dir, '.github', 'workflows', f), 'x')
  }
  return dir
}

function rec(over: Partial<WorkflowRecord>): WorkflowRecord {
  return { id: 1, name: 'W', path: '', state: 'active', ...over }
}

describe('findOrphanFiles', () => {
  test('matches only the four canonical orphan names', () => {
    const d = fixtureRepo(['lint.yml', 'ci.yml', 'build-curl.yml', 'test.yaml'])
    assert.deepEqual(findOrphanFiles(d), ['lint.yml', 'test.yaml'])
  })
  test('empty when there is no workflows dir', () => {
    const d = mkdtempSync(path.join(os.tmpdir(), 'cci-none-'))
    assert.deepEqual(findOrphanFiles(d), [])
  })
})

describe('isStaleRecord', () => {
  const d = fixtureRepo(['ci.yml', 'build-curl.yml'])
  test('orphan-named record is stale even if its file exists', () => {
    assert.equal(
      isStaleRecord(
        rec({ name: 'Lint', path: '.github/workflows/lint.yml' }),
        d,
      ),
      true,
    )
  })
  test('a record whose file is present is not stale', () => {
    assert.equal(
      isStaleRecord(rec({ name: 'CI', path: '.github/workflows/ci.yml' }), d),
      false,
    )
  })
  test('a record whose backing file is gone is stale', () => {
    assert.equal(
      isStaleRecord(
        rec({ name: 'Gone', path: '.github/workflows/deleted.yml' }),
        d,
      ),
      true,
    )
  })
  test('a legitimate per-repo workflow (present file, non-orphan name) is kept', () => {
    assert.equal(
      isStaleRecord(
        rec({ name: 'Build', path: '.github/workflows/build-curl.yml' }),
        d,
      ),
      false,
    )
  })
})
