// vitest spec for check-test-scripts-are-deferred. The pure classifier
// (classifyTestScript / isNodeTestTierPath) is exercised directly; scanRepo
// runs over a mkdtemp fixture tree. Importing the check is side-effect-free
// (main() is entrypoint-guarded).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  classifyTestScript,
  isNodeTestTierPath,
  scanRepo,
} from '../../../scripts/fleet/check/test-scripts-are-deferred.mts'

describe('isNodeTestTierPath', () => {
  test('a hook package.json is in the node --test tier', () => {
    assert.ok(
      isNodeTestTierPath(
        '.claude/hooks/fleet/no-glob-run-s-guard/package.json',
      ),
    )
  })

  test('an oxlint-plugin rule package.json is in the node --test tier', () => {
    assert.ok(
      isNodeTestTierPath(
        '.config/fleet/oxlint-plugin/fleet/no-boolean-trap/package.json',
      ),
    )
  })

  test('a git-hooks package.json is in the node --test tier', () => {
    assert.ok(isNodeTestTierPath('.git-hooks/package.json'))
  })

  test('a root or package package.json is NOT in the node --test tier', () => {
    assert.ok(!isNodeTestTierPath('package.json'))
    assert.ok(!isNodeTestTierPath('packages/keymap/package.json'))
  })
})

describe('classifyTestScript', () => {
  test('a root .mts wrapper passes', () => {
    assert.equal(
      classifyTestScript('package.json', 'node scripts/fleet/test.mts'),
      'compliant',
    )
  })

  test('a package-relative .mts wrapper with extra flags passes', () => {
    assert.equal(
      classifyTestScript(
        'packages/keymap/package.json',
        'node ../../scripts/fleet/test.mts --quiet',
      ),
      'compliant',
    )
  })

  test('an empty script value passes (nothing to run)', () => {
    assert.equal(classifyTestScript('package.json', ''), 'compliant')
  })

  test('a bare `vitest run` is a raw-runner violation', () => {
    assert.equal(
      classifyTestScript('packages/keymap/package.json', 'vitest run'),
      'raw-runner',
    )
  })

  test('a bare `jest` is a raw-runner violation', () => {
    assert.equal(classifyTestScript('package.json', 'jest'), 'raw-runner')
  })

  test('a bare `mocha` is a raw-runner violation', () => {
    assert.equal(
      classifyTestScript('package.json', 'mocha test/**/*.test.mts'),
      'raw-runner',
    )
  })

  test('a bare `ava` is a raw-runner violation', () => {
    assert.equal(classifyTestScript('package.json', 'ava'), 'raw-runner')
  })

  test('a bare `tap` is a raw-runner violation', () => {
    assert.equal(
      classifyTestScript('package.json', 'tap test/*.test.js'),
      'raw-runner',
    )
  })

  test('`node --test` outside the hook/lint-rule tier is a raw-runner violation', () => {
    assert.equal(
      classifyTestScript(
        'packages/keymap/package.json',
        'node --test test/*.test.mts',
      ),
      'raw-runner',
    )
  })

  test('a `test:unit` variant is classified the same as `test`', () => {
    assert.equal(
      classifyTestScript('packages/keymap/package.json', 'vitest run'),
      'raw-runner',
    )
    assert.equal(
      classifyTestScript('package.json', 'node scripts/fleet/test.mts'),
      'compliant',
    )
  })

  test('`node --test` INSIDE the hook tier is exempt', () => {
    assert.equal(
      classifyTestScript(
        '.claude/hooks/fleet/no-glob-run-s-guard/package.json',
        'node --test test/*.test.mts',
      ),
      'exempt',
    )
  })

  test('`node --test` INSIDE the oxlint-plugin tier is exempt', () => {
    assert.equal(
      classifyTestScript(
        '.config/fleet/oxlint-plugin/fleet/no-boolean-trap/package.json',
        'node --test test/*.test.mts',
      ),
      'exempt',
    )
  })
})

describe('scanRepo', () => {
  test('flags raw runners, passes .mts wrappers, skips the hook tier', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'test-scripts-deferred-'))
    // Compliant root package.
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ scripts: { test: 'node scripts/fleet/test.mts' } }),
    )
    // Violation: a monorepo package with a raw vitest test script.
    mkdirSync(path.join(root, 'packages', 'keymap'), { recursive: true })
    writeFileSync(
      path.join(root, 'packages', 'keymap', 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'vitest run',
          'test:unit': 'node --test test/*.test.mts',
        },
      }),
    )
    // Exempt: the hook tier's canonical node --test form.
    mkdirSync(path.join(root, '.claude', 'hooks', 'fleet', 'some-guard'), {
      recursive: true,
    })
    writeFileSync(
      path.join(
        root,
        '.claude',
        'hooks',
        'fleet',
        'some-guard',
        'package.json',
      ),
      JSON.stringify({ scripts: { test: 'node --test test/*.test.mts' } }),
    )
    const findings = scanRepo(root)
    assert.equal(findings.length, 2)
    const keys = findings.map(f => f.scriptKey).toSorted()
    assert.deepEqual(keys, ['test', 'test:unit'])
    assert.ok(
      findings.every(f => f.file.includes(path.join('packages', 'keymap'))),
    )
  })

  test('a repo with no violations reports zero findings', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'test-scripts-deferred-'))
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ scripts: { test: 'node scripts/fleet/test.mts' } }),
    )
    assert.deepEqual(scanRepo(root), [])
  })

  test('a package.json with no scripts block is skipped', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'test-scripts-deferred-'))
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'pkg' }),
    )
    assert.deepEqual(scanRepo(root), [])
  })
})
