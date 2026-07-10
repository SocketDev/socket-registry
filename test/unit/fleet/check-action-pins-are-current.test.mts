// vitest spec for check-action-pins-are-current. The enforcer's pure functions
// (closure model + escaping-read detection + pin rewrite) are exercised with an
// injected GitRunner so no real repo is needed; buildUnits runs over a temp
// .github fixture tree. Importing the check is side-effect-free (main() is
// entrypoint-guarded).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  buildUnits,
  closureFor,
  coversRead,
  detectEscapingReads,
  findStalePins,
  findUndeclared,
  parseDeclaredDataDeps,
  parseInternalPins,
  parseRepoFromRemote,
  rewritePin,
  stripYamlComments,
  unitId,
  unitOwnPaths,
} from '../../../scripts/fleet/check/action-pins-are-current.mts'
import type {
  GitRunner,
  Unit,
} from '../../../scripts/fleet/check/action-pins-are-current.mts'

const SHA = (c: string): string => c.repeat(40)
const SELF = 'SocketDev/socket-registry'

// A GitRunner whose countSince returns >0 only when a named path is in the
// closure, so a test can assert the data edge drives staleness.
function fakeGit(opts: {
  reachable?: boolean | undefined
  changedPath?: string | undefined
}): GitRunner {
  return {
    isReachable: () => opts.reachable ?? true,
    countSince: (_sha, _base, paths) =>
      opts.changedPath && paths.includes(opts.changedPath) ? 1 : 0,
    committerDate: () => '2026-06-17',
    resolve: () => SHA('f'),
  }
}

function unit(
  kind: 'actions' | 'workflows',
  name: string,
  partial: Partial<Unit> = {},
): Unit {
  const ref = { kind, name }
  return {
    ...ref,
    id: unitId(ref),
    ownPaths: unitOwnPaths(ref),
    deps: [],
    dataDeps: [],
    reads: [],
    ...partial,
  }
}

describe('stripYamlComments', () => {
  test('drops full-line and trailing comments', () => {
    assert.equal(stripYamlComments('a: 1 # trailing').trim(), 'a: 1')
    assert.equal(stripYamlComments('  # whole line\nb: 2').trim(), 'b: 2')
  })
})

describe('detectEscapingReads', () => {
  test('resolves ${GITHUB_ACTION_PATH}/../ reads, excludes comments, dedups', () => {
    const content = [
      'runs:',
      '  steps:',
      '    - run: cat ${GITHUB_ACTION_PATH}/../../../external-tools.json',
      '    - run: . ${GITHUB_ACTION_PATH}/../lib/u.mjs',
      '    - run: cat ${GITHUB_ACTION_PATH}/../../../external-tools.json',
      '    # ${GITHUB_ACTION_PATH}/../ignored.txt',
    ].join('\n')
    assert.deepEqual(detectEscapingReads('setup', content), [
      '.github/actions/lib/u.mjs',
      'external-tools.json',
    ])
  })

  test('no escaping reads → empty', () => {
    assert.deepEqual(detectEscapingReads('x', 'runs:\n  using: composite'), [])
  })
})

describe('parseDeclaredDataDeps', () => {
  test('parses the comma list, normalizes, sorts', () => {
    assert.deepEqual(
      parseDeclaredDataDeps(
        '# cascade-data-deps: external-tools.json, .github/actions/lib',
      ),
      ['.github/actions/lib', 'external-tools.json'],
    )
  })
  test('absent → empty', () => {
    assert.deepEqual(parseDeclaredDataDeps('no deps here'), [])
  })
})

describe('coversRead', () => {
  test('exact match', () => {
    assert.equal(
      coversRead(['external-tools.json'], 'external-tools.json'),
      true,
    )
  })
  test('ancestor dir covers a file beneath it', () => {
    assert.equal(
      coversRead(['.github/actions/lib'], '.github/actions/lib/u.mjs'),
      true,
    )
  })
  test('unrelated does not cover', () => {
    assert.equal(coversRead(['a.json'], 'b.json'), false)
    // a prefix that is not a path-segment ancestor must not match
    assert.equal(coversRead(['lib'], 'library.json'), false)
  })
})

describe('parseInternalPins', () => {
  test('parses repo/kind/name/sha and strips commented uses', () => {
    const live = `uses: ${SELF}/.github/actions/setup@${SHA('a')}`
    assert.deepEqual(parseInternalPins(live), [
      { repo: SELF, kind: 'actions', name: 'setup', sha: SHA('a') },
    ])
    assert.equal(
      parseInternalPins(`# uses: ${SELF}/.github/workflows/ci@${SHA('b')}`)
        .length,
      0,
    )
  })
})

describe('parseRepoFromRemote', () => {
  test('ssh, https, .git suffix, trailing slash', () => {
    assert.equal(parseRepoFromRemote(`git@github.com:${SELF}.git`), SELF)
    assert.equal(parseRepoFromRemote(`https://github.com/${SELF}`), SELF)
    assert.equal(parseRepoFromRemote(`https://github.com/${SELF}.git/`), SELF)
  })
  test('garbage → empty', () => {
    assert.equal(parseRepoFromRemote(''), '')
  })
})

describe('buildUnits', () => {
  test('discovers actions + workflows with deps, dataDeps, reads', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'action-pins-'))
    mkdirSync(path.join(root, '.github/actions/setup'), { recursive: true })
    mkdirSync(path.join(root, '.github/workflows'), { recursive: true })
    writeFileSync(
      path.join(root, '.github/actions/setup/action.yml'),
      [
        '# cascade-data-deps: external-tools.json',
        'runs:',
        '  steps:',
        '    - run: cat ${GITHUB_ACTION_PATH}/../../../external-tools.json',
      ].join('\n'),
    )
    writeFileSync(
      path.join(root, '.github/workflows/ci.yml'),
      `jobs:\n  x:\n    uses: ${SELF}/.github/actions/setup@${SHA('a')}`,
    )
    const units = buildUnits(root)
    const setup = units.get('actions/setup')!
    assert.deepEqual(setup.dataDeps, ['external-tools.json'])
    assert.deepEqual(setup.reads, ['external-tools.json'])
    const ci = units.get('workflows/ci')!
    assert.equal(ci.deps.length, 1)
    assert.equal(ci.deps[0]!.name, 'setup')
  })

  test('no .github → empty map', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'action-pins-empty-'))
    assert.equal(buildUnits(root).size, 0)
  })
})

describe('closureFor', () => {
  test('includes a transitive self-repo dep + its data edge', () => {
    const units = new Map<string, Unit>([
      [
        'actions/setup',
        unit('actions', 'setup', { dataDeps: ['external-tools.json'] }),
      ],
      [
        'actions/setup-and-install',
        unit('actions', 'setup-and-install', {
          deps: [{ repo: SELF, kind: 'actions', name: 'setup', sha: SHA('a') }],
        }),
      ],
    ])
    assert.deepEqual(closureFor('actions/setup-and-install', units, SELF), [
      '.github/actions/setup',
      '.github/actions/setup-and-install',
      'external-tools.json',
    ])
  })

  test('does not follow a cross-repo dep of the same basename', () => {
    const units = new Map<string, Unit>([
      [
        'workflows/ci',
        unit('workflows', 'ci', { dataDeps: ['LOCAL_ONLY.txt'] }),
      ],
      [
        'workflows/release',
        unit('workflows', 'release', {
          deps: [
            {
              repo: 'Other/repo',
              kind: 'workflows',
              name: 'ci',
              sha: SHA('a'),
            },
          ],
        }),
      ],
    ])
    assert.deepEqual(closureFor('workflows/release', units, SELF), [
      '.github/workflows/release.yml',
    ])
  })

  test('cycle-guarded', () => {
    const units = new Map<string, Unit>([
      [
        'actions/a',
        unit('actions', 'a', {
          deps: [{ repo: SELF, kind: 'actions', name: 'b', sha: SHA('1') }],
        }),
      ],
      [
        'actions/b',
        unit('actions', 'b', {
          deps: [{ repo: SELF, kind: 'actions', name: 'a', sha: SHA('2') }],
        }),
      ],
    ])
    assert.deepEqual(closureFor('actions/a', units, SELF), [
      '.github/actions/a',
      '.github/actions/b',
    ])
  })
})

describe('findUndeclared', () => {
  test('flags an escaping read missing a data-dep declaration', () => {
    const units = new Map<string, Unit>([
      [
        'actions/setup',
        unit('actions', 'setup', { reads: ['external-tools.json'] }),
      ],
    ])
    const msgs = findUndeclared(units)
    assert.equal(msgs.length, 1)
    assert.match(msgs[0]!, /external-tools\.json/)
  })

  test('declared read passes', () => {
    const units = new Map<string, Unit>([
      [
        'actions/setup',
        unit('actions', 'setup', {
          reads: ['external-tools.json'],
          dataDeps: ['external-tools.json'],
        }),
      ],
    ])
    assert.deepEqual(findUndeclared(units), [])
  })
})

describe('findStalePins', () => {
  const producer = (): Map<string, Unit> =>
    new Map<string, Unit>([
      [
        'actions/setup',
        unit('actions', 'setup', { dataDeps: ['external-tools.json'] }),
      ],
      [
        'actions/setup-and-install',
        unit('actions', 'setup-and-install', {
          deps: [{ repo: SELF, kind: 'actions', name: 'setup', sha: SHA('a') }],
        }),
      ],
    ])

  test('STALE when a data edge changed since the pin', () => {
    const findings = findStalePins(
      producer(),
      'origin/main',
      fakeGit({ changedPath: 'external-tools.json' }),
      SELF,
    )
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.verdict, 'stale')
    assert.equal(findings[0]!.dep, 'actions/setup')
  })

  test('CURRENT when nothing in the closure changed', () => {
    assert.deepEqual(
      findStalePins(producer(), 'origin/main', fakeGit({}), SELF),
      [],
    )
  })

  test('UNREACHABLE when the pinned SHA is not an ancestor of base', () => {
    const findings = findStalePins(
      producer(),
      'origin/main',
      fakeGit({ reachable: false }),
      SELF,
    )
    assert.equal(findings[0]!.verdict, 'unreachable')
  })

  test('a cross-repo pin (consumer side) is skipped', () => {
    assert.deepEqual(
      findStalePins(
        producer(),
        'origin/main',
        fakeGit({ changedPath: 'external-tools.json' }),
        'SocketDev/socket-wheelhouse',
      ),
      [],
    )
  })

  test('MISSING_DEP when a self-repo pin references a dep gone from the tree', () => {
    // The action moved tiers or was deleted: any newer SHA breaks the ref, and
    // repinning to HEAD guarantees it. Silently skipping this once shipped a
    // false-green while a reusable workflow pointed at a nonexistent path.
    const units = new Map<string, Unit>([
      [
        'workflows/ci',
        unit('workflows', 'ci', {
          deps: [
            { repo: SELF, kind: 'actions', name: 'remote-only', sha: SHA('a') },
          ],
        }),
      ],
    ])
    const findings = findStalePins(units, 'origin/main', fakeGit({}), SELF)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.verdict, 'missing_dep')
    assert.equal(findings[0]!.dep, 'actions/remote-only')
  })
})

describe('rewritePin', () => {
  test('rewrites the SHA and refreshes the trailing comment', () => {
    const text = `uses: X/Y/.github/actions/s@${SHA('a')} # main (2026-01-01)`
    assert.equal(
      rewritePin(text, SHA('a'), SHA('b'), 'main (2026-06-17)'),
      `uses: X/Y/.github/actions/s@${SHA('b')} # main (2026-06-17)`,
    )
  })

  test('adds a comment when the pin had none, and rewrites every occurrence', () => {
    const text = `a@${SHA('a')}\nb@${SHA('a')}`
    assert.equal(
      rewritePin(text, SHA('a'), SHA('c'), 'main (2026-06-17)'),
      `a@${SHA('c')} # main (2026-06-17)\nb@${SHA('c')} # main (2026-06-17)`,
    )
  })
})
