// vitest specs for the convention-guards-consult-fleet-context code-is-law
// check — the bidirectional CONVENTION_GUARDS ⟺ isFleetTarget invariant.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  CONVENTION_GUARDS,
  findDiscrepancies,
  guardConsultsDetector,
  listConsultingGuards,
} from '../../../scripts/fleet/check/convention-guards-consult-fleet-context.mts'

test('no discrepancies when the consulting set equals CONVENTION_GUARDS', () => {
  assert.deepEqual(findDiscrepancies([...CONVENTION_GUARDS]), [])
})

test('flags a convention guard that stopped consulting the detector', () => {
  const missing = CONVENTION_GUARDS.slice(1)
  const d = findDiscrepancies([...missing])
  assert.equal(d.length, 1)
  assert.equal(d[0]!.name, CONVENTION_GUARDS[0])
  assert.match(d[0]!.problem, /does NOT import/)
})

test('flags an unregistered guard that started consulting the detector', () => {
  const d = findDiscrepancies([...CONVENTION_GUARDS, 'surprise-guard'])
  assert.equal(d.length, 1)
  assert.equal(d[0]!.name, 'surprise-guard')
  assert.match(d[0]!.problem, /NOT in CONVENTION_GUARDS/)
})

test('guardConsultsDetector + listConsultingGuards read index.mts', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cgc-'))
  try {
    mkdirSync(path.join(root, 'aaa-guard'))
    writeFileSync(
      path.join(root, 'aaa-guard', 'index.mts'),
      'import { isFleetTarget } from "../_shared/fleet-context.mts"\n',
    )
    mkdirSync(path.join(root, 'bbb-guard'))
    writeFileSync(
      path.join(root, 'bbb-guard', 'index.mts'),
      'export const check = 1\n',
    )
    mkdirSync(path.join(root, '_shared'))
    assert.equal(guardConsultsDetector(root, 'aaa-guard'), true)
    assert.equal(guardConsultsDetector(root, 'bbb-guard'), false)
    assert.deepEqual(listConsultingGuards(root), ['aaa-guard'])
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
