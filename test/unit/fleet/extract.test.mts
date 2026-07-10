import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, test } from 'vitest'

import {
  extractReadmeLead,
  extractRepoFacts,
} from '../../../scripts/fleet/lib/llms-txt/extract.mts'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'llms-txt-test-'))
})

afterEach(() => {
  rmSync(tmpDir, { force: true, recursive: true })
})

function writePkg(dir: string, pkg: Record<string, unknown>): void {
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(pkg, undefined, 2),
  )
}

describe('extractReadmeLead', () => {
  test('skips H1 and badges, returns first paragraph', () => {
    const readmePath = path.join(tmpDir, 'README.md')
    writeFileSync(
      readmePath,
      [
        '# My Repo',
        '[![CI](badge)](link)',
        '',
        'This repo does things.',
        'It has multiple lines in the first paragraph.',
        '',
        'Second paragraph.',
      ].join('\n'),
    )
    const lead = extractReadmeLead(readmePath)
    assert.equal(
      lead,
      'This repo does things. It has multiple lines in the first paragraph.',
    )
  })

  test('returns undefined for missing file', () => {
    assert.equal(extractReadmeLead(path.join(tmpDir, 'MISSING.md')), undefined)
  })

  test('truncates to 400 chars', () => {
    const readmePath = path.join(tmpDir, 'README.md')
    writeFileSync(readmePath, 'x'.repeat(500))
    const lead = extractReadmeLead(readmePath)
    assert.ok(lead !== undefined && lead.length <= 400)
  })
})

describe('extractRepoFacts', () => {
  test('extracts all fields from package.json', () => {
    writePkg(tmpDir, {
      engines: { node: '>=24' },
      license: 'Apache-2.0',
      name: '@scope/my-pkg',
      version: '2.0.0',
    })
    const facts = extractRepoFacts(tmpDir)
    assert.equal(facts.repoName, 'my-pkg')
    assert.equal(facts.version, '2.0.0')
    assert.equal(facts.nodeFloor, '>=24')
    assert.equal(facts.license, 'Apache-2.0')
    assert.equal(facts.layout, 'single-package')
  })

  test('resolves repoName from basename when no package.json', () => {
    const subDir = path.join(tmpDir, 'my-repo-name')
    mkdirSync(subDir)
    const facts = extractRepoFacts(subDir)
    assert.equal(facts.repoName, 'my-repo-name')
  })

  test('detects monorepo from workspaces field', () => {
    writePkg(tmpDir, { name: 'mono', workspaces: ['packages/*'] })
    const facts = extractRepoFacts(tmpDir)
    assert.equal(facts.layout, 'monorepo')
  })

  test('detects monorepo from pnpm-workspace.yaml', () => {
    writePkg(tmpDir, { name: 'mono' })
    writeFileSync(
      path.join(tmpDir, 'pnpm-workspace.yaml'),
      'packages:\n  - packages/*\n',
    )
    const facts = extractRepoFacts(tmpDir)
    assert.equal(facts.layout, 'monorepo')
  })

  test('reads layout from socket-wheelhouse config', () => {
    writePkg(tmpDir, { name: 'repo' })
    const configDir = path.join(tmpDir, '.config')
    mkdirSync(configDir)
    writeFileSync(
      path.join(configDir, 'socket-wheelhouse.json'),
      JSON.stringify({ layout: 'monorepo', repoName: 'custom-name' }),
    )
    const facts = extractRepoFacts(tmpDir)
    assert.equal(facts.layout, 'monorepo')
    assert.equal(facts.repoName, 'custom-name')
  })

  test('is resilient with empty repo directory', () => {
    const emptyDir = path.join(tmpDir, 'empty')
    mkdirSync(emptyDir)
    const facts = extractRepoFacts(emptyDir)
    assert.equal(facts.repoName, 'empty')
    assert.equal(facts.layout, 'single-package')
    assert.equal(facts.version, undefined)
  })
})
