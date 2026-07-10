// vitest spec for check-external-tools-are-valid. The check's exported pure
// functions (findToolFiles, scanRepo) are exercised against temp fixture
// directories so no real repo or network is needed. Importing the check is
// side-effect-free (main() is entrypoint-guarded).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  findToolFiles,
  scanRepo,
} from '../../../scripts/fleet/check/external-tools-are-valid.mts'

function makeTmp(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'ext-tools-valid-'))
}

function writeJson(dir: string, relPath: string, data: unknown): void {
  const abs = path.join(dir, relPath)
  mkdirSync(path.dirname(abs), { recursive: true })
  writeFileSync(abs, JSON.stringify(data, null, 2))
}

const validToolsConfig = {
  tools: {
    sfw: {
      version: '1.2.3',
      description: 'socket firewall wrapper',
    },
  },
}

describe('findToolFiles', () => {
  test('finds external-tools.json at repo root', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', validToolsConfig)
    const files = findToolFiles(root)
    assert.ok(
      files.includes('external-tools.json'),
      `expected 'external-tools.json' in ${JSON.stringify(files)}`,
    )
  })

  test('finds bundle-tools.json under packages/', () => {
    const root = makeTmp()
    writeJson(root, 'packages/cli/bundle-tools.json', validToolsConfig)
    const files = findToolFiles(root)
    assert.ok(
      files.some(f => f.endsWith('bundle-tools.json')),
      `expected a bundle-tools.json in ${JSON.stringify(files)}`,
    )
  })

  test('finds external-tools.json under .claude/ (dot dir)', () => {
    const root = makeTmp()
    writeJson(
      root,
      '.claude/hooks/fleet/setup-security-tools/external-tools.json',
      validToolsConfig,
    )
    const files = findToolFiles(root)
    assert.ok(
      files.some(f => f.includes('.claude')),
      `expected a .claude/ file in ${JSON.stringify(files)}`,
    )
  })

  test('ignores files under node_modules', () => {
    const root = makeTmp()
    writeJson(root, 'node_modules/pkg/external-tools.json', validToolsConfig)
    const files = findToolFiles(root)
    assert.ok(
      !files.some(f => f.includes('node_modules')),
      `node_modules should be excluded, got ${JSON.stringify(files)}`,
    )
  })

  test('ignores files under dist/', () => {
    const root = makeTmp()
    writeJson(root, 'dist/external-tools.json', validToolsConfig)
    const files = findToolFiles(root)
    assert.ok(
      !files.some(f => f.startsWith('dist/')),
      `dist/ should be excluded, got ${JSON.stringify(files)}`,
    )
  })

  test('returns empty array when no tool files exist', () => {
    const root = makeTmp()
    assert.deepEqual(findToolFiles(root), [])
  })
})

describe('scanRepo', () => {
  test('PASS — valid external-tools.json produces no issues', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', validToolsConfig)
    const issues = scanRepo(root)
    assert.deepEqual(issues, [])
  })

  test('PASS — valid bundle-tools.json produces no issues', () => {
    const root = makeTmp()
    writeJson(root, 'packages/cli/bundle-tools.json', validToolsConfig)
    const issues = scanRepo(root)
    assert.deepEqual(issues, [])
  })

  test('PASS — empty repo (no tool files) produces no issues', () => {
    const root = makeTmp()
    const issues = scanRepo(root)
    assert.deepEqual(issues, [])
  })

  test('FAIL — file with an unknown (additional) property at tool entry level', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', {
      tools: {
        sfw: {
          version: '1.2.3',
          unknownField: 'should-be-rejected',
        },
      },
    })
    const issues = scanRepo(root)
    assert.ok(
      issues.length > 0,
      'expected at least one issue for unknown field',
    )
    assert.ok(
      issues.some(i => i.file === 'external-tools.json'),
      `expected issue pointing at external-tools.json, got ${JSON.stringify(issues)}`,
    )
  })

  test('FAIL — root-level additional property is rejected', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', {
      tools: {},
      unknownRootProp: true,
    })
    const issues = scanRepo(root)
    assert.ok(
      issues.length > 0,
      'expected schema violation for unknown root property',
    )
    assert.ok(
      issues.some(i => i.file === 'external-tools.json'),
      `expected issue in external-tools.json, got ${JSON.stringify(issues)}`,
    )
  })

  test('FAIL — missing required "tools" key', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', { description: 'no tools key' })
    const issues = scanRepo(root)
    assert.ok(issues.length > 0, 'expected issue for missing tools key')
  })

  test('FAIL — invalid JSON is reported as an issue (not a throw)', () => {
    const root = makeTmp()
    const abs = path.join(root, 'external-tools.json')
    writeFileSync(abs, '{ "tools": { INVALID JSON }')
    const issues = scanRepo(root)
    assert.ok(issues.length > 0, 'expected an issue for invalid JSON')
    assert.ok(
      issues.some(i => i.path === '(file)'),
      `expected path '(file)' for JSON parse error, got ${JSON.stringify(issues)}`,
    )
  })

  test('FAIL — invalid platform entry (missing required asset field) is flagged', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', {
      tools: {
        sfw: {
          version: '1.2.3',
          platforms: {
            'linux-x64': {
              // missing required 'asset' field
              integrity: 'sha256-abc',
            },
          },
        },
      },
    })
    const issues = scanRepo(root)
    assert.ok(
      issues.length > 0,
      'expected issue for missing platform asset field',
    )
  })

  test('PASS — valid platforms entry produces no issues', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', {
      tools: {
        sfw: {
          version: '1.2.3',
          platforms: {
            'linux-x64': {
              asset: 'sfw-linux-x64',
              integrity: 'sha256-abc123',
            },
          },
        },
      },
    })
    const issues = scanRepo(root)
    assert.deepEqual(issues, [])
  })

  test('PASS — soakBypass with all required fields is valid', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', {
      tools: {
        sfw: {
          version: '1.2.3',
          soakBypass: {
            version: '1.2.3',
            published: '2026-06-01',
            removable: '2026-06-08',
          },
        },
      },
    })
    const issues = scanRepo(root)
    assert.deepEqual(issues, [])
  })

  test('FAIL — soakBypass missing removable field is rejected', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', {
      tools: {
        sfw: {
          version: '1.2.3',
          soakBypass: {
            version: '1.2.3',
            published: '2026-06-01',
            // missing 'removable'
          },
        },
      },
    })
    const issues = scanRepo(root)
    assert.ok(
      issues.length > 0,
      'expected issue for missing soakBypass.removable',
    )
  })

  test('FileIssue shape — each issue has file, path, and message', () => {
    const root = makeTmp()
    writeJson(root, 'external-tools.json', { description: 'no tools key' })
    const issues = scanRepo(root)
    assert.ok(issues.length > 0)
    for (const issue of issues) {
      assert.equal(typeof issue.file, 'string', 'file must be a string')
      assert.equal(typeof issue.path, 'string', 'path must be a string')
      assert.equal(typeof issue.message, 'string', 'message must be a string')
    }
  })
})
