// vitest specs for the greening-ci-local runner pure helpers: classifyFailure
// (env-gap vs code boundary detection), parsePausedRunner (run.paused NDJSON
// scan), buildAgentCiArgs (CLI assembly), and parseArgs. The agent-ci spawn +
// fix/retry loop is integration-level; these specs lock the deterministic
// classification + arg-building.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  buildAgentCiArgs,
  classifyFailure,
  parseArgs,
  parsePausedRunner,
} from '../../../.claude/skills/fleet/greening-ci-local/run.mts'

test('classifyFailure flags a missing system library as an env-gap', () => {
  const r = classifyFailure(
    'error while loading shared libraries: libatomic.so.1',
  )
  assert.equal(r.classification, 'env-gap')
  assert.match(r.envGapReason ?? '', /system library/)
})

test('classifyFailure flags a Docker daemon outage as an env-gap', () => {
  const r = classifyFailure(
    'Cannot connect to the Docker daemon at unix:///var/run/docker.sock',
  )
  assert.equal(r.classification, 'env-gap')
  assert.match(r.envGapReason ?? '', /Docker daemon/)
})

test('classifyFailure flags OIDC/Depot unavailability as an env-gap', () => {
  const r = classifyFailure('failed to mint id-token via DEPOT_TOKEN')
  assert.equal(r.classification, 'env-gap')
})

test('classifyFailure treats an ordinary assertion failure as code', () => {
  const r = classifyFailure('AssertionError: expected 1 to equal 2')
  assert.equal(r.classification, 'code')
  assert.equal(r.envGapReason, undefined)
})

test('parsePausedRunner reads the last run.paused NDJSON event', () => {
  const output = [
    '{"event":"run.started"}',
    'some human log line',
    '{"event":"run.paused","runner":"build-linux-x64","retry_cmd":"agent-ci retry"}',
  ].join('\n')
  const r = parsePausedRunner(output)
  assert.equal(r.runnerName, 'build-linux-x64')
  assert.equal(r.retryCmd, 'agent-ci retry')
})

test('parsePausedRunner falls back to obj.name and returns undefined when absent', () => {
  assert.deepEqual(parsePausedRunner('no json here'), {
    retryCmd: undefined,
    runnerName: undefined,
  })
  const named = parsePausedRunner('{"event":"run.paused","name":"x"}')
  assert.equal(named.runnerName, 'x')
})

test('buildAgentCiArgs builds a single-workflow run with the no-matrix flag', () => {
  const args = parseArgs([
    '--workflow',
    '.github/workflows/ci.yml',
    '--no-matrix',
  ])
  const ci = buildAgentCiArgs(args)
  assert.ok(ci.includes('run'))
  assert.ok(ci.includes('--workflow'))
  assert.ok(ci.includes('.github/workflows/ci.yml'))
  assert.ok(ci.includes('--no-matrix'))
  assert.ok(ci.includes('--pause-on-failure'))
})

test('buildAgentCiArgs builds a retry invocation with --from-step', () => {
  const args = parseArgs(['--retry', 'build-linux-x64', '--from-step', '3'])
  const ci = buildAgentCiArgs(args)
  assert.ok(ci.includes('retry'))
  assert.ok(ci.includes('--name'))
  assert.ok(ci.includes('build-linux-x64'))
  assert.ok(ci.includes('--from-step'))
  assert.ok(ci.includes('3'))
})

test('buildAgentCiArgs defaults to run --all when no workflow/retry given', () => {
  const ci = buildAgentCiArgs(parseArgs([]))
  assert.ok(ci.includes('run'))
  assert.ok(ci.includes('--all'))
})

test('parseArgs reads --budget-sec and a string --github-token', () => {
  const args = parseArgs(['--budget-sec', '900', '--github-token', 'tok123'])
  assert.equal(args.budgetSec, 900)
  assert.equal(args.githubToken, 'tok123')
})

test('parseArgs treats a bare --github-token as true', () => {
  const args = parseArgs(['--github-token'])
  assert.equal(args.githubToken, true)
})

test('parseArgs throws on an unknown argument', () => {
  assert.throws(() => parseArgs(['--nope']), /Unknown argument/)
})
