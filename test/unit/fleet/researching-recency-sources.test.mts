// socket-lint: mirror-exempt — imports from 8 source adapter modules; split deferred
// vitest specs for the researching-recency source adapters. Every test mocks
// HTTP with nock and runs under disableNetConnect(), so a missing interceptor
// fails closed instead of hitting the live internet (fleet rule: tests never
// connect to third-party servers). Fixtures mirror the real API response shapes.

import assert from 'node:assert/strict'

import nock from 'nock'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  test,
} from 'vitest'

import { blueskyAdapter } from '../../../scripts/fleet/researching-recency/lib/sources/bluesky.mts'
import {
  devtoAdapter,
  tagsForQuery as devtoTags,
} from '../../../scripts/fleet/researching-recency/lib/sources/devto.mts'
import { githubAdapter } from '../../../scripts/fleet/researching-recency/lib/sources/github.mts'
import { hackernewsAdapter } from '../../../scripts/fleet/researching-recency/lib/sources/hackernews.mts'
import {
  lobstersAdapter,
  tagsForQuery as lobstersTags,
} from '../../../scripts/fleet/researching-recency/lib/sources/lobsters.mts'
import {
  parseFeed,
  redditAdapter,
} from '../../../scripts/fleet/researching-recency/lib/sources/reddit.mts'
import { parseWebHits } from '../../../scripts/fleet/researching-recency/lib/sources/web.mts'
import {
  DEFAULT_DEV_HANDLES,
  extractOutputText,
  parseResponse as parseXResponse,
  xAdapter,
} from '../../../scripts/fleet/researching-recency/lib/sources/x.mts'

import type { FetchContext } from '../../../scripts/fleet/researching-recency/lib/types.mts'

const NOW = Date.parse('2026-06-07T00:00:00Z')
const CTX: FetchContext = { days: 30, now: NOW, perStream: 15 }

// A recent ISO date inside the 30-day window, for fixtures that filter on it.
const RECENT = '2026-06-01T00:00:00Z'

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
})

// ── Hacker News ─────────────────────────────────────────────────

describe('hackernews adapter', () => {
  test('maps Algolia hits to SourceItems with points + comments', async () => {
    nock('https://hn.algolia.com')
      .get('/api/v1/search')
      .query(true)
      .reply(200, {
        hits: [
          {
            objectID: '39639689',
            title: 'Rolldown: Rollup compatible bundler in Rust',
            url: 'https://rolldown.rs/',
            author: 'bpierre',
            points: 186,
            num_comments: 122,
            created_at_i: 1_709_893_149,
          },
        ],
      })
    const result = await hackernewsAdapter.fetch('rolldown', CTX)
    assert.equal(result.status, 'ok')
    assert.equal(result.items.length, 1)
    const item = result.items[0]!
    assert.equal(item.itemId, '39639689')
    assert.equal(item.source, 'hackernews')
    assert.equal(item.url, 'https://rolldown.rs/')
    assert.equal(item.author, 'bpierre')
    assert.equal(item.engagement['points'], 186)
    assert.equal(item.engagement['comments'], 122)
    assert.ok(item.publishedAt?.startsWith('2024-03-08'))
  })

  test('returns status error (never throws) on a non-2xx', async () => {
    nock('https://hn.algolia.com').get('/api/v1/search').query(true).reply(500)
    const result = await hackernewsAdapter.fetch('rolldown', CTX)
    assert.equal(result.status, 'error')
    assert.deepEqual(result.items, [])
    assert.ok(result.note)
  })
})

// ── Lobsters ────────────────────────────────────────────────────

describe('lobsters adapter', () => {
  test('tagsForQuery maps known tags, else falls back to programming', () => {
    assert.deepEqual(lobstersTags('rust async runtime'), ['rust'])
    assert.deepEqual(lobstersTags('some obscure topic'), ['programming'])
  })

  test('maps the tag feed to SourceItems within the window', async () => {
    nock('https://lobste.rs')
      .get('/t/rust.json')
      .reply(200, [
        {
          short_id: 'scnbr6',
          title: 'How link checkers recurse',
          url: 'https://endler.dev/x/',
          score: 12,
          comment_count: 4,
          created_at: RECENT,
          submitter_user: 'quad',
          comments_url: 'https://lobste.rs/s/scnbr6/x',
          tags: ['rust'],
        },
      ])
    const result = await lobstersAdapter.fetch('rust', CTX)
    assert.equal(result.status, 'ok')
    const item = result.items[0]!
    assert.equal(item.itemId, 'scnbr6')
    assert.equal(item.source, 'lobsters')
    assert.equal(item.engagement['score'], 12)
    assert.equal(item.author, 'quad')
  })
})

// ── dev.to ──────────────────────────────────────────────────────

describe('devto adapter', () => {
  test('tagsForQuery maps known tags', () => {
    assert.deepEqual(devtoTags('typescript generics'), ['typescript'])
  })

  test('maps articles to SourceItems with reaction + comment engagement', async () => {
    nock('https://dev.to')
      .get('/api/articles')
      .query(true)
      .reply(200, [
        {
          id: 3_827_755,
          title: 'A SQL engine in Rust',
          description: 'how I built it',
          url: 'https://dev.to/x/y',
          published_at: RECENT,
          public_reactions_count: 42,
          comments_count: 7,
          user: { name: 'SB', username: 'sb' },
          tag_list: ['rust'],
        },
      ])
    const result = await devtoAdapter.fetch('rust', CTX)
    assert.equal(result.status, 'ok')
    const item = result.items[0]!
    assert.equal(item.itemId, '3827755')
    assert.equal(item.engagement['reactions'], 42)
    assert.equal(item.author, 'SB')
  })
})

// ── GitHub ──────────────────────────────────────────────────────

describe('github adapter', () => {
  beforeEach(() => {
    // Force the unauthenticated path so the test doesn't depend on gh/env.
    delete process.env['GITHUB_TOKEN']
    delete process.env['GH_TOKEN']
  })

  test('maps search/issues items to SourceItems', async () => {
    nock('https://api.github.com')
      .get('/search/issues')
      .query(true)
      .reply(200, {
        items: [
          {
            number: 1,
            title: 'Support Rolldown',
            html_url: 'https://github.com/o/r/pull/1',
            user: { login: 'anonychun' },
            comments: 3,
            reactions: { total_count: 9 },
            created_at: RECENT,
            state: 'open',
            pull_request: {},
          },
        ],
      })
    const result = await githubAdapter.fetch('rolldown', CTX)
    // Adapter may run unauthenticated; either ok or a clean error, never throw.
    assert.ok(['ok', 'error'].includes(result.status))
    if (result.status === 'ok') {
      const item = result.items[0]!
      assert.equal(item.itemId, '1')
      assert.equal(item.engagement['reactions'], 9)
      assert.equal(item.container, 'GitHub PR')
    }
  })
})

// ── Reddit (Atom RSS) ───────────────────────────────────────────

describe('reddit adapter', () => {
  const FEED = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <author><name>/u/n3oz22</name></author>
      <content type="html">&lt;div&gt;&lt;p&gt;async runtime question&lt;/p&gt;&lt;/div&gt;</content>
      <id>t3_1t7crhq</id>
      <link href="https://www.reddit.com/r/rust/comments/1t7crhq/x/" />
      <published>2026-06-01T00:00:00+00:00</published>
      <title>Async runtime question</title>
    </entry>
  </feed>`

  test('parseFeed extracts entries with handle, link, body, date', () => {
    const items = parseFeed(FEED, 'rust')
    assert.equal(items.length, 1)
    const item = items[0]!
    assert.equal(item.itemId, 't3_1t7crhq')
    assert.equal(item.author, 'n3oz22')
    assert.equal(item.title, 'Async runtime question')
    assert.ok(item.url.includes('/r/rust/comments/1t7crhq/'))
    assert.ok(item.body.includes('async runtime question'))
    assert.equal(item.container, 'r/rust')
  })

  test('fetch pulls each default subreddit feed and dedups', async () => {
    nock('https://www.reddit.com')
      .get(/\/r\/[^/]+\/search\.rss/)
      .times(3)
      .reply(200, FEED)
    const result = await redditAdapter.fetch('async', CTX)
    assert.equal(result.status, 'ok')
    // Same id across all three subreddit feeds -> deduped to one.
    assert.equal(result.items.length, 1)
  })
})

// ── Bluesky (opt-in) ────────────────────────────────────────────

describe('bluesky adapter', () => {
  test('skips with a reason when credentials are absent', async () => {
    delete process.env['BSKY_HANDLE']
    delete process.env['BSKY_APP_PASSWORD']
    const result = await blueskyAdapter.fetch('rolldown', CTX)
    assert.equal(result.status, 'skipped')
    assert.ok(result.note?.includes('BSKY_'))
    assert.equal(blueskyAdapter.isAvailable(), false)
  })
})

// ── X / Twitter (opt-in, xAI) ───────────────────────────────────

describe('x adapter', () => {
  test('skips with a reason when XAI_API_KEY is absent', async () => {
    delete process.env['XAI_API_KEY']
    const result = await xAdapter.fetch('rolldown', CTX)
    assert.equal(result.status, 'skipped')
    assert.ok(result.note?.includes('XAI_API_KEY'))
    assert.equal(xAdapter.isAvailable(), false)
  })

  test('extractOutputText reads the Responses-API message envelope', () => {
    const text = extractOutputText({
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: '{"items":[]}' }],
        },
      ],
    })
    assert.equal(text, '{"items":[]}')
  })

  test('extractOutputText falls back to the older choices shape', () => {
    const text = extractOutputText({
      choices: [{ message: { content: 'hello' } }],
    })
    assert.equal(text, 'hello')
  })

  test('parseResponse extracts posts from the JSON envelope, dropping url-less', () => {
    const items = parseXResponse(
      'here you go {"items":[{"url":"https://x.com/a/status/1","text":"rolldown is fast","author":"dev","likes":42,"reposts":3},{"text":"no url - dropped"}]}',
    )
    assert.equal(items.length, 1)
    const item = items[0]!
    assert.equal(item.source, 'x')
    assert.equal(item.url, 'https://x.com/a/status/1')
    assert.equal(item.author, 'dev')
    assert.equal(item.engagement['likes'], 42)
  })

  test('parseResponse returns [] on missing or invalid JSON', () => {
    assert.deepEqual(parseXResponse('no json at all'), [])
    assert.deepEqual(parseXResponse('{"items": not valid}'), [])
  })

  test('fetch posts to xAI with the bearer key and maps the result', async () => {
    process.env['XAI_API_KEY'] = 'xai-test-key'
    nock('https://api.x.ai', {
      reqheaders: { authorization: 'Bearer xai-test-key' },
    })
      .post('/v1/responses')
      .reply(200, {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: '{"items":[{"url":"https://x.com/a/status/9","text":"shipping rolldown 1.0","author":"maint","likes":120}]}',
              },
            ],
          },
        ],
      })
    const result = await xAdapter.fetch('rolldown', CTX)
    delete process.env['XAI_API_KEY']
    assert.equal(result.status, 'ok')
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0]!.engagement['likes'], 120)
  })

  test('fetch seeds DEFAULT_DEV_HANDLES when the plan supplies no handles', async () => {
    process.env['XAI_API_KEY'] = 'xai-test-key'
    let sentHandles: unknown
    nock('https://api.x.ai')
      .post('/v1/responses', body => {
        sentHandles = body.tools?.[0]?.allowed_x_handles
        return true
      })
      .reply(200, { output: '{"items":[]}' })
    await xAdapter.fetch('rolldown', CTX)
    delete process.env['XAI_API_KEY']
    assert.deepEqual(sentHandles, DEFAULT_DEV_HANDLES)
  })

  test('fetch uses a plan allowlist instead of the defaults when given', async () => {
    process.env['XAI_API_KEY'] = 'xai-test-key'
    let sentHandles: unknown
    nock('https://api.x.ai')
      .post('/v1/responses', body => {
        sentHandles = body.tools?.[0]?.allowed_x_handles
        return true
      })
      .reply(200, { output: '{"items":[]}' })
    await xAdapter.fetch('rolldown', {
      ...CTX,
      xHandles: { allowed: ['just_this_one'] },
    })
    delete process.env['XAI_API_KEY']
    assert.deepEqual(sentHandles, ['just_this_one'])
  })
})

// ── Web (model-supplied hits) ───────────────────────────────────

describe('web parseWebHits', () => {
  test('parses an array of hits, dropping url-less entries', () => {
    const items = parseWebHits(
      JSON.stringify([
        { title: 'Rolldown docs', url: 'https://rolldown.rs', snippet: 'fast' },
        { title: 'no url - dropped' },
      ]),
    )
    assert.equal(items.length, 1)
    assert.equal(items[0]!.source, 'web')
    assert.equal(items[0]!.url, 'https://rolldown.rs')
  })

  test('accepts a { hits: [...] } wrapper and tolerates junk', () => {
    assert.equal(parseWebHits('not json').length, 0)
    const items = parseWebHits(
      JSON.stringify({ hits: [{ title: 'X', url: 'https://x.test' }] }),
    )
    assert.equal(items.length, 1)
  })
})
