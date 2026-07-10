import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, test } from 'vitest'

import { extractRepoFacts } from '../../../scripts/fleet/lib/llms-txt/extract.mts'
import { buildSections } from '../../../scripts/fleet/lib/llms-txt/sections.mts'

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

function writeReadme(dir: string, content: string): void {
  writeFileSync(path.join(dir, 'README.md'), content)
}

describe('buildSections', () => {
  test('includes README in Docs section', () => {
    writePkg(tmpDir, { name: 'repo' })
    writeReadme(tmpDir, '# Repo\n\nDoes things.\n')
    const facts = extractRepoFacts(tmpDir)
    const sections = buildSections(tmpDir, facts)
    const docs = sections.find(s => s.title === 'Docs')
    assert.ok(docs !== undefined)
    assert.ok(docs.links.some(l => l.name === 'README'))
  })

  test('README is the lead entry in Docs', () => {
    writePkg(tmpDir, { name: 'repo' })
    writeReadme(tmpDir, '# Repo\n\nDoes things.\n')
    const facts = extractRepoFacts(tmpDir)
    const sections = buildSections(tmpDir, facts)
    const docs = sections.find(s => s.title === 'Docs')
    assert.ok(docs !== undefined && docs.links[0]?.name === 'README')
  })

  test('Packages section is populated for monorepo layout', () => {
    writePkg(tmpDir, { name: 'mono', workspaces: ['packages/*'] })
    const pkgDir = path.join(tmpDir, 'packages', 'core')
    mkdirSync(pkgDir, { recursive: true })
    writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"core"}')
    const facts = extractRepoFacts(tmpDir)
    const sections = buildSections(tmpDir, facts)
    const pkgs = sections.find(s => s.title === 'Packages')
    assert.ok(pkgs !== undefined && pkgs.links.some(l => l.name === 'core'))
  })

  test('Packages section is empty for single-package layout', () => {
    writePkg(tmpDir, { name: 'repo' })
    const facts = extractRepoFacts(tmpDir)
    const sections = buildSections(tmpDir, facts)
    const pkgs = sections.find(s => s.title === 'Packages')
    assert.ok(pkgs === undefined || pkgs.links.length === 0)
  })

  test('Commands section includes pnpm run check when present in scripts', () => {
    writePkg(tmpDir, {
      name: 'repo',
      scripts: { check: 'node scripts/check.mts', test: 'vitest' },
    })
    const facts = extractRepoFacts(tmpDir)
    const sections = buildSections(tmpDir, facts)
    const cmds = sections.find(s => s.title === 'Commands')
    assert.ok(
      cmds !== undefined && cmds.links.some(l => l.name === 'pnpm run check'),
    )
  })

  test('Conventions section includes CLAUDE.md when present', () => {
    writePkg(tmpDir, { name: 'repo' })
    writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Rules\n')
    const facts = extractRepoFacts(tmpDir)
    const sections = buildSections(tmpDir, facts)
    const conv = sections.find(s => s.title === 'Conventions')
    assert.ok(
      conv !== undefined && conv.links.some(l => l.name === 'CLAUDE.md'),
    )
  })
})
