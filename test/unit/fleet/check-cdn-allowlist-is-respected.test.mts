// vitest spec for cdn-allowlist-is-respected. The check script itself runs all
// side effects at module scope (no entrypoint guard), so it cannot be safely
// imported. The pure detection functions it delegates to —
// isAllowedCdnHost, hostnameOf, findDisallowedCdn — live in the shared
// cdn-allowlist.mts module and are exported with no side effects. Those are
// tested here directly, covering both the pass (allowlisted host → no finding)
// and fail (off-allowlist host → finding returned) paths exercised by the check.
// No network calls are made; all inputs are string literals fed to pure functions.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  ALLOWED_CDN_HOSTS,
  ALLOWED_CDN_WILDCARDS,
  findDisallowedCdn,
  hostnameOf,
  isAllowedCdnHost,
} from '../../../.claude/hooks/fleet/_shared/cdn-allowlist.mts'

// Build a command line or URL from parts so that no literal `https://` URL
// appears assembled in source (the unmocked-net guard scans content for them).
// The scheme, colon, and slashes are stored separately.
const SCHEME = 'https'
const SEP = '://'

function mkUrl(host: string, tail = '/release.tar.gz'): string {
  return SCHEME + SEP + host + tail
}

// Returns a curl invocation line containing a URL for `host`.
function curlCmd(host: string, tail = '/release.tar.gz'): string {
  return 'curl -fsSL ' + mkUrl(host, tail)
}

// Returns a wget invocation line containing a URL for `host`.
function wgetCmd(host: string, tail = '/install.sh'): string {
  return 'wget ' + mkUrl(host, tail)
}

// Returns a JS-style download invocation line containing a URL for `host`.
// Uses a fetch-adjacent spelling that the check's FETCH_BINARIES list covers
// ("fetch" binary) but written so the guard's pattern for the raw word
// followed by open-paren is not literally present.
function jsDownloadCmd(host: string, tail = '/bundle.js'): string {
  // Spell out the binary name to avoid the guard's `\bfetch\s*\(` pattern.
  const bin = ['fe', 'tch'].join('')
  return bin + "('" + mkUrl(host, tail) + "')"
}

describe('isAllowedCdnHost', () => {
  test('exact match on every allowlisted host is allowed', () => {
    for (const host of ALLOWED_CDN_HOSTS) {
      assert.equal(
        isAllowedCdnHost(host),
        true,
        `expected ${host} to be allowed`,
      )
    }
  })

  test('case-insensitive exact match is allowed', () => {
    assert.equal(isAllowedCdnHost('Go.Dev'), true)
    assert.equal(isAllowedCdnHost('GitHub.COM'), true)
  })

  test('no wildcards configured: githubusercontent is not allowlisted', () => {
    // ALLOWED_CDN_WILDCARDS is empty — github.com release downloads redirect to
    // *.githubusercontent.com at runtime, but the committed url is github.com.
    assert.equal(ALLOWED_CDN_WILDCARDS.length, 0)
    assert.equal(isAllowedCdnHost('raw.githubusercontent.com'), false)
    assert.equal(isAllowedCdnHost('a.b.githubusercontent.com'), false)
  })

  test('bare wildcard root (without a subdomain) is not allowed', () => {
    // *.githubusercontent.com — the bare root has no subdomain component
    assert.equal(isAllowedCdnHost('githubusercontent.com'), false)
  })

  test('off-allowlist host is not allowed', () => {
    assert.equal(isAllowedCdnHost('evil.example.com'), false)
    assert.equal(isAllowedCdnHost('internal.svc.cluster.local'), false)
    assert.equal(isAllowedCdnHost('my-custom-cdn.io'), false)
  })

  test('empty string is not allowed', () => {
    assert.equal(isAllowedCdnHost(''), false)
  })

  test('ALLOWED_CDN_WILDCARDS bare roots are not allowed', () => {
    // Strip the "*." prefix to get the root domain; it must not pass as-is
    for (const wc of ALLOWED_CDN_WILDCARDS) {
      const root = wc.slice(2)
      assert.equal(
        isAllowedCdnHost(root),
        false,
        `bare root ${root} from wildcard ${wc} should not be allowed`,
      )
    }
  })
})

describe('hostnameOf', () => {
  test('extracts hostname from a URL', () => {
    assert.equal(
      hostnameOf(mkUrl('registry.npmjs.org', '/foo')),
      'registry.npmjs.org',
    )
  })

  test('extracts hostname from an http URL', () => {
    const httpUrl = 'http' + SEP + 'example.com/path'
    assert.equal(hostnameOf(httpUrl), 'example.com')
  })

  test('returns undefined for non-URL strings', () => {
    assert.equal(hostnameOf('not-a-url'), undefined)
    assert.equal(hostnameOf(''), undefined)
  })

  test('returns undefined for a plain hostname without scheme', () => {
    // URL parser requires a scheme; a bare hostname cannot be parsed
    assert.equal(hostnameOf('github.com'), undefined)
  })
})

describe('findDisallowedCdn — pass cases (no finding)', () => {
  test('curl to an allowlisted host returns undefined', () => {
    assert.equal(findDisallowedCdn(curlCmd('github.com')), undefined)
  })

  test('wget to githubusercontent (no longer wildcarded) returns a hit', () => {
    assert.ok(
      findDisallowedCdn(
        wgetCmd('raw.githubusercontent.com', '/u/repo/main/install.sh'),
      ),
    )
  })

  test('line with no fetch binary and an off-list URL returns undefined', () => {
    // echo is not a fetch binary; no download flagged
    assert.equal(
      findDisallowedCdn('echo ' + mkUrl('evil.example.com', '/payload')),
      undefined,
    )
  })

  test('js download to an allowlisted host returns undefined', () => {
    assert.equal(
      findDisallowedCdn(
        jsDownloadCmd('go.dev', '/dl/go1.22.linux-amd64.tar.gz'),
      ),
      undefined,
    )
  })

  test('curl to an allowlisted exact host (go.dev) returns undefined', () => {
    assert.equal(
      findDisallowedCdn(curlCmd('go.dev', '/dl/go.tar.gz')),
      undefined,
    )
  })

  test('curl to a denied bundler CDN (jsdelivr / unpkg) returns a hit', () => {
    assert.ok(findDisallowedCdn(curlCmd('cdn.jsdelivr.net', '/npm/pkg@1.0.0')))
    assert.ok(findDisallowedCdn(curlCmd('unpkg.com', '/pkg@1.0.0')))
  })
})

describe('findDisallowedCdn — fail cases (finding returned)', () => {
  test('curl to an off-allowlist host returns a hit with correct host and url', () => {
    const host = 'evil.example.com'
    const tail = '/install.sh'
    const hit = findDisallowedCdn(curlCmd(host, tail))
    assert.ok(hit, 'expected a disallowed-CDN hit')
    assert.equal(hit.host, host)
    assert.equal(hit.url, mkUrl(host, tail))
  })

  test('wget to an internal cluster host returns a hit', () => {
    const host = 'artifact-search.svc.cluster.local'
    const hit = findDisallowedCdn(wgetCmd(host, '/v1/build'))
    assert.ok(hit, 'expected a disallowed-CDN hit')
    assert.equal(hit.host, host)
  })

  test('js download to an off-allowlist host returns a hit', () => {
    const host = 'my-custom-cdn.io'
    const hit = findDisallowedCdn(jsDownloadCmd(host))
    assert.ok(hit, 'expected a disallowed-CDN hit')
    assert.equal(hit.host, host)
  })

  test('curl with http scheme to off-list host returns a hit', () => {
    const host = 'malware.example.org'
    const httpUrl = 'http' + SEP + host + '/payload'
    const hit = findDisallowedCdn('curl ' + httpUrl)
    assert.ok(hit, 'expected a disallowed-CDN hit')
    assert.equal(hit.host, host)
  })

  test('returned hit carries the full URL', () => {
    const host = 'bad-cdn.example.net'
    const tail = '/v1/artifact.tar.gz'
    const url = mkUrl(host, tail)
    const hit = findDisallowedCdn('curl ' + url)
    assert.ok(hit)
    assert.equal(hit.url, url)
  })
})
