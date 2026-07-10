// vitest specs for check-memories-are-codified.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, test } from 'vitest'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'

import {
  findUncodifiedMemories,
  isCodified,
  memoryStoreDir,
  memoryType,
} from '../../../scripts/fleet/check/memories-are-codified.mts'

const here = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT_PATH = path.resolve(
  here,
  '../../../scripts/fleet/check/memories-are-codified.mts',
)

// A realistic memory frontmatter block: `enforcement:`/`type:` nested two
// spaces under `metadata:`, matching the shape Claude Code actually writes.
function memoryFile(options: {
  enforcement?: string | undefined
  type?: string | undefined
}): string {
  const { enforcement, type } = options
  const lines = ['---', 'name: ""', 'metadata: ']
  if (type !== undefined) {
    lines.push(`  type: ${type}`)
  }
  if (enforcement !== undefined) {
    lines.push(`  enforcement: ${enforcement}`)
  }
  lines.push('  node_type: memory', '---', '', 'Body text.')
  return lines.join('\n')
}

// ── memoryStoreDir ───────────────────────────────────────────────

describe('memoryStoreDir', () => {
  test('slugs the repo root by replacing path separators with -', () => {
    const out = memoryStoreDir('/tmp/projects/foo', '/tmp/home')
    assert.equal(
      out,
      path.join(
        '/tmp/home',
        '.claude',
        'projects',
        '-tmp-projects-foo',
        'memory',
      ),
    )
  })

  test('defaults home to os.homedir() when not passed', () => {
    const out = memoryStoreDir('/tmp/repo')
    assert.ok(out.startsWith(os.homedir()))
    assert.ok(out.endsWith(path.join('memory')))
  })
})

// ── isCodified ───────────────────────────────────────────────────

describe('isCodified', () => {
  test('true for a nested enforcement: line under metadata:', () => {
    assert.equal(
      isCodified(memoryFile({ type: 'project', enforcement: 'deferred #1' })),
      true,
    )
  })

  test('true for a top-level enforcement: line', () => {
    assert.equal(isCodified('enforcement: n/a — preference only'), true)
  })

  test('false when no enforcement: line is present', () => {
    assert.equal(isCodified(memoryFile({ type: 'project' })), false)
  })

  test('false when enforcement: has no value', () => {
    assert.equal(
      isCodified('metadata:\n  enforcement:\n  type: project'),
      false,
    )
  })
})

// ── memoryType ───────────────────────────────────────────────────

describe('memoryType', () => {
  test('reads a nested type: value under metadata:', () => {
    assert.equal(memoryType(memoryFile({ type: 'feedback' })), 'feedback')
  })

  test('reads a top-level type: value', () => {
    assert.equal(memoryType('type: reference\nfoo: bar'), 'reference')
  })

  test('undefined when no type: line is present', () => {
    assert.equal(
      memoryType('metadata:\n  enforcement: n/a — pointer'),
      undefined,
    )
  })
})

// ── findUncodifiedMemories ───────────────────────────────────────

function makeMemoryDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'memories-codified-'))
}

describe('findUncodifiedMemories', () => {
  test('missing dir returns zero candidates and no gaps (CI / fresh checkout)', () => {
    const out = findUncodifiedMemories('/nonexistent/path/for/sure')
    assert.deepEqual(out, { candidates: 0, uncodified: [] })
  })

  test('skips MEMORY.md (the index, not a codifiable lesson)', () => {
    const dir = makeMemoryDir()
    writeFileSync(path.join(dir, 'MEMORY.md'), memoryFile({ type: 'project' }))
    const out = findUncodifiedMemories(dir)
    assert.deepEqual(out, { candidates: 0, uncodified: [] })
  })

  test('skips non-.md files', () => {
    const dir = makeMemoryDir()
    writeFileSync(path.join(dir, 'notes.txt'), memoryFile({ type: 'project' }))
    const out = findUncodifiedMemories(dir)
    assert.deepEqual(out, { candidates: 0, uncodified: [] })
  })

  test('exempts reference/user memory types (pointers, not codifiable rules)', () => {
    const dir = makeMemoryDir()
    writeFileSync(
      path.join(dir, 'reference_foo.md'),
      memoryFile({ type: 'reference' }),
    )
    writeFileSync(path.join(dir, 'user_bar.md'), memoryFile({ type: 'user' }))
    const out = findUncodifiedMemories(dir)
    assert.deepEqual(out, { candidates: 0, uncodified: [] })
  })

  test('a codified feedback memory counts as a candidate but not a gap', () => {
    const dir = makeMemoryDir()
    writeFileSync(
      path.join(dir, 'feedback_codified.md'),
      memoryFile({ type: 'feedback', enforcement: '.claude/hooks/fleet/foo' }),
    )
    const out = findUncodifiedMemories(dir)
    assert.deepEqual(out, { candidates: 1, uncodified: [] })
  })

  test('an uncodified project memory is a candidate AND a gap', () => {
    const dir = makeMemoryDir()
    writeFileSync(
      path.join(dir, 'project_gap.md'),
      memoryFile({ type: 'project' }),
    )
    const out = findUncodifiedMemories(dir)
    assert.deepEqual(out, { candidates: 1, uncodified: ['project_gap.md'] })
  })

  test('gap list is sorted and mixes candidates correctly', () => {
    const dir = makeMemoryDir()
    writeFileSync(
      path.join(dir, 'project_zed.md'),
      memoryFile({ type: 'project' }),
    )
    writeFileSync(
      path.join(dir, 'feedback_alpha.md'),
      memoryFile({ type: 'feedback' }),
    )
    writeFileSync(
      path.join(dir, 'feedback_ok.md'),
      memoryFile({ type: 'feedback', enforcement: 'n/a — style only' }),
    )
    const out = findUncodifiedMemories(dir)
    assert.equal(out.candidates, 3)
    assert.deepEqual(out.uncodified, ['feedback_alpha.md', 'project_zed.md'])
  })
})

// ── main() (subprocess — exercises the CLI + logged message shapes) ──

function runCheck(
  home: string,
  repoRoot: string,
): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('node', [SCRIPT_PATH], {
    env: { ...process.env, CLAUDE_PROJECT_DIR: repoRoot, HOME: home },
    stdioString: true,
  })
  return {
    stdout: String(result.stdout),
    stderr: String(result.stderr),
    exitCode: result.status ?? -1,
  }
}

describe('main() — no memory store for this project', () => {
  test('exits 0 with the skip message when the store dir is absent', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'memories-home-'))
    const { exitCode, stdout } = runCheck(home, '/tmp/some-fresh-checkout')
    assert.equal(exitCode, 0)
    assert.match(stdout, /skipped \(no memory store/)
  })
})

describe('main() — all memories codified', () => {
  test('exits 0 and reports the OK summary', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'memories-home-'))
    const repoRoot = '/tmp/repo-all-codified'
    const dir = memoryStoreDir(repoRoot, home)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      path.join(dir, 'feedback_ok.md'),
      memoryFile({ type: 'feedback', enforcement: 'n/a — style only' }),
    )
    const { exitCode, stdout } = runCheck(home, repoRoot)
    assert.equal(exitCode, 0)
    assert.match(stdout, /OK — all 1 codifiable memories carry/)
  })
})

describe('main() — uncodified memories present', () => {
  test('exits 1 and lists the offending file with the documented message shape', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'memories-home-'))
    const repoRoot = '/tmp/repo-with-gap'
    const dir = memoryStoreDir(repoRoot, home)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      path.join(dir, 'project_gap.md'),
      memoryFile({ type: 'project' }),
    )
    const { exitCode, stderr } = runCheck(home, repoRoot)
    assert.equal(exitCode, 1)
    assert.match(stderr, /1\/1 codifiable memories are UNCODIFIED/)
    assert.match(stderr, /project_gap\.md/)
    assert.match(stderr, /Pair each with an enforcer/)
  })
})
