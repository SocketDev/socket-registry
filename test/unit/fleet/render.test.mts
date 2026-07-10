import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, test } from 'vitest'

import { extractRepoFacts } from '../../../scripts/fleet/lib/llms-txt/extract.mts'
import {
  parseStructure,
  renderDocument,
  structuresMatch,
} from '../../../scripts/fleet/lib/llms-txt/render.mts'
import { buildSections } from '../../../scripts/fleet/lib/llms-txt/sections.mts'
import type { RepoFacts } from '../../../scripts/fleet/lib/llms-txt/types.mts'

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

const BASE_FACTS: RepoFacts = {
  layout: 'single-package',
  license: 'MIT',
  nodeFloor: '>=24',
  readmeLead: 'A library for building things.',
  repoName: 'my-repo',
  version: '1.2.3',
}

describe('renderDocument', () => {
  test('includes H1, blockquote summary, and section headings', () => {
    const sections = buildSections(tmpDir, BASE_FACTS)
    const rendered = renderDocument(
      BASE_FACTS,
      'Concise summary.',
      sections,
      {},
    )
    assert.ok(rendered.startsWith('# my-repo'))
    assert.ok(rendered.includes('> Concise summary.'))
  })

  test('omits empty sections', () => {
    const rendered = renderDocument(BASE_FACTS, 'Summary.', [], {})
    assert.ok(!rendered.includes('## Docs'))
    assert.ok(!rendered.includes('## API'))
  })

  test('uses filled note over deterministic note', () => {
    writePkg(tmpDir, { name: 'repo' })
    writeFileSync(path.join(tmpDir, 'README.md'), '# Repo\n\nDoes things.\n')
    const facts = extractRepoFacts(tmpDir)
    const sections = buildSections(tmpDir, facts)
    const filled = { 'note:docs:readme': 'AI-filled README note' }
    const rendered = renderDocument(facts, 'Summary.', sections, filled)
    assert.ok(rendered.includes('AI-filled README note'))
  })

  test('enforces 16 KB hard cap', () => {
    const bigSummary = 'x'.repeat(20_000)
    const rendered = renderDocument(BASE_FACTS, bigSummary, [], {})
    assert.ok(Buffer.byteLength(rendered, 'utf8') <= 16 * 1024 + 64)
  })
})

describe('parseStructure', () => {
  test('parses H1, section titles, and links', () => {
    const doc = [
      '# my-repo',
      '',
      '> Summary.',
      '',
      '## Docs',
      '',
      '- [README](README.md): The readme.',
      '',
      '## Commands',
      '',
      '- [pnpm run check](package.json): node scripts/check.mts',
      '',
    ].join('\n')
    const struct = parseStructure(doc)
    assert.equal(struct.h1, 'my-repo')
    assert.deepEqual(struct.sectionTitles, ['Docs', 'Commands'])
    assert.deepEqual(struct.sectionLinks['Docs'], [['README', 'README.md']])
    assert.deepEqual(struct.sectionLinks['Commands'], [
      ['pnpm run check', 'package.json'],
    ])
  })
})

describe('structuresMatch', () => {
  test('returns true for identical structures', () => {
    const a = {
      h1: 'repo',
      sectionLinks: { Docs: [['README', 'README.md'] as [string, string]] },
      sectionTitles: ['Docs'],
    }
    const b = {
      h1: 'repo',
      sectionLinks: { Docs: [['README', 'README.md'] as [string, string]] },
      sectionTitles: ['Docs'],
    }
    assert.ok(structuresMatch(a, b))
  })

  test('returns false when H1 differs', () => {
    const a = { h1: 'repo-a', sectionLinks: {}, sectionTitles: [] }
    const b = { h1: 'repo-b', sectionLinks: {}, sectionTitles: [] }
    assert.ok(!structuresMatch(a, b))
  })

  test('returns false when link count differs', () => {
    const a = {
      h1: 'r',
      sectionLinks: { Docs: [['A', 'a.md'] as [string, string]] },
      sectionTitles: ['Docs'],
    }
    const b = { h1: 'r', sectionLinks: { Docs: [] }, sectionTitles: ['Docs'] }
    assert.ok(!structuresMatch(a, b))
  })

  test('ignores prose differences (same links = match)', () => {
    const a = {
      h1: 'r',
      sectionLinks: { Docs: [['README', 'README.md'] as [string, string]] },
      sectionTitles: ['Docs'],
    }
    const b = {
      h1: 'r',
      sectionLinks: { Docs: [['README', 'README.md'] as [string, string]] },
      sectionTitles: ['Docs'],
    }
    assert.ok(structuresMatch(a, b))
  })
})
