// vitest specs for check-ci-local-is-canonical.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  ciLocalScript,
  templateDockerfilePath,
} from '../../../scripts/fleet/check/ci-local-is-canonical.mts'

const CANONICAL = 'agent-ci run --all --quiet --pause-on-failure --github-token'

function tmpRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'ci-local-'))
}

function writePkg(dir: string, scripts: Record<string, string>): void {
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'socket-test', scripts }),
  )
}

// ── ciLocalScript ───────────────────────────────────────────────

test('ciLocalScript returns the canonical command when present', () => {
  const dir = tmpRepo()
  writePkg(dir, { 'ci:local': CANONICAL })
  assert.equal(ciLocalScript(dir), CANONICAL)
})

test('ciLocalScript surfaces a DRIFTED command verbatim (the failing arm)', () => {
  const dir = tmpRepo()
  // A repo that lost the --github-token flag — the check must catch this.
  writePkg(dir, { 'ci:local': 'agent-ci run --all --quiet --pause-on-failure' })
  const got = ciLocalScript(dir)
  assert.notEqual(got, CANONICAL)
  assert.equal(got, 'agent-ci run --all --quiet --pause-on-failure')
})

test('ciLocalScript returns undefined when no ci:local script', () => {
  const dir = tmpRepo()
  writePkg(dir, { test: 'vitest run' })
  assert.equal(ciLocalScript(dir), undefined)
})

test('ciLocalScript returns undefined when no package.json', () => {
  const dir = tmpRepo()
  assert.equal(ciLocalScript(dir), undefined)
})

// ── templateDockerfilePath ──────────────────────────────────────

test('templateDockerfilePath finds the in-repo template copy (wheelhouse)', () => {
  const dir = tmpRepo()
  // The canonical seed lives under template/base/ (not the old top-level
  // template/), matching templateDockerfilePath's probe.
  const ghDir = path.join(dir, 'template', 'base', '.github')
  mkdirSync(ghDir, { recursive: true })
  writeFileSync(path.join(ghDir, 'agent-ci.Dockerfile'), 'FROM x\n')
  assert.equal(
    templateDockerfilePath(dir),
    path.join(dir, 'template', 'base', '.github', 'agent-ci.Dockerfile'),
  )
})

test('templateDockerfilePath returns undefined in a downstream repo (no template/)', () => {
  const dir = tmpRepo()
  assert.equal(templateDockerfilePath(dir), undefined)
})
