// vitest specs for scripts/fleet/whose-work.mts — the own-work discriminator
// that stops a session mis-attributing its OWN local-ahead commits to a
// phantom parallel session. Covers the pure functions (parse / classify /
// report); the git-spawning helpers are exercised by the integration path.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  classifyWork,
  formatReport,
  parseCommitLog,
} from '../../../scripts/fleet/whose-work.mts'

const SEP = String.fromCharCode(0x1f)

function logLine(
  sha: string,
  email: string,
  name: string,
  date: string,
  subject: string,
): string {
  return [sha, email, name, date, subject].join(SEP)
}

describe('whose-work / parseCommitLog', () => {
  test('parses well-formed lines', () => {
    const raw = [
      logLine(
        'abc123',
        'me@x.dev',
        'Me',
        '2026-07-01T10:00:00-04:00',
        'feat: a',
      ),
      logLine(
        'def456',
        'bot@x.dev',
        'Bot',
        '2026-07-01T09:00:00-04:00',
        'chore: b',
      ),
    ].join('\n')
    const commits = parseCommitLog(raw)
    assert.equal(commits.length, 2)
    assert.equal(commits[0]!.sha, 'abc123')
    assert.equal(commits[0]!.authorEmail, 'me@x.dev')
    assert.equal(commits[0]!.subject, 'feat: a')
  })

  test('keeps subjects containing punctuation the separator survives', () => {
    const raw = logLine(
      'aa',
      'me@x.dev',
      'Me',
      '2026-07-01T10:00:00-04:00',
      'fix(scope): a, b; c — d | e',
    )
    const commits = parseCommitLog(raw)
    assert.equal(commits.length, 1)
    assert.equal(commits[0]!.subject, 'fix(scope): a, b; c — d | e')
  })

  test('skips blank and malformed (under-5-field) lines', () => {
    const raw = ['', 'not-a-real-line', logLine('a', 'b', 'c', 'd', 'e')].join(
      '\n',
    )
    assert.equal(parseCommitLog(raw).length, 1)
  })

  test('empty input yields no commits', () => {
    assert.deepEqual(parseCommitLog(''), [])
  })
})

describe('whose-work / classifyWork', () => {
  const commits = [
    {
      authorEmail: 'me@x.dev',
      authorName: 'Me',
      isoDate: 'd',
      sha: 's1',
      subject: 'mine',
    },
    {
      authorEmail: 'other@x.dev',
      authorName: 'Other',
      isoDate: 'd',
      sha: 's2',
      subject: 'theirs',
    },
  ]

  test('splits by the current identity email', () => {
    const { mine, otherIdentity } = classifyWork({
      commits,
      myEmail: 'me@x.dev',
    })
    assert.equal(mine.length, 1)
    assert.equal(mine[0]!.sha, 's1')
    assert.equal(otherIdentity.length, 1)
    assert.equal(otherIdentity[0]!.sha, 's2')
  })

  test('undefined identity classifies everything as other', () => {
    const { mine, otherIdentity } = classifyWork({
      commits,
      myEmail: undefined,
    })
    assert.equal(mine.length, 0)
    assert.equal(otherIdentity.length, 2)
  })

  test('empty commits yield empty buckets', () => {
    const { mine, otherIdentity } = classifyWork({
      commits: [],
      myEmail: 'me@x.dev',
    })
    assert.equal(mine.length, 0)
    assert.equal(otherIdentity.length, 0)
  })
})

describe('whose-work / formatReport', () => {
  const mkCommit = (n: number, email: string) => ({
    authorEmail: email,
    authorName: 'N',
    isoDate: '2026-07-01T10:00:00-04:00',
    sha: `sha${n}`,
    subject: `subject ${n}`,
  })

  test('no base ref → own-work-first fallback, no crash', () => {
    const out = formatReport({
      baseRef: undefined,
      classification: { mine: [], otherIdentity: [] },
      myEmail: 'me@x.dev',
    })
    assert.match(out, /your own earlier work/)
  })

  test('nothing local-ahead is stated plainly', () => {
    const out = formatReport({
      baseRef: 'origin/main',
      classification: { mine: [], otherIdentity: [] },
      myEmail: 'me@x.dev',
    })
    assert.match(out, /Nothing local-ahead/)
  })

  test('mine leads with "YOURS by default" and the verdict says land not investigate', () => {
    const out = formatReport({
      baseRef: 'origin/main',
      classification: { mine: [mkCommit(1, 'me@x.dev')], otherIdentity: [] },
      myEmail: 'me@x.dev',
    })
    assert.match(out, /YOURS by default/)
    assert.match(out, /land, don't investigate/)
  })

  test('truncates mine over 15', () => {
    const mine = Array.from({ length: 20 }, (_, i) => mkCommit(i, 'me@x.dev'))
    const out = formatReport({
      baseRef: 'origin/main',
      classification: { mine, otherIdentity: [] },
      myEmail: 'me@x.dev',
    })
    assert.match(out, /and 5 more/)
  })

  test('other-identity commits are surfaced as still-local, not a rival', () => {
    const out = formatReport({
      baseRef: 'origin/main',
      classification: {
        mine: [],
        otherIdentity: [mkCommit(1, 'bot@x.dev')],
      },
      myEmail: 'me@x.dev',
    })
    assert.match(out, /Other identity/)
    assert.match(out, /not a rival session/)
  })
})
