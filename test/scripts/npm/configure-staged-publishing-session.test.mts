/**
 * @file Tests for the staged-publishing configurator's access-page readiness —
 *   pure functions, no browser, no clock. The load-bearing case is the one that
 *   broke a live run: npm answers the sign-in / one-time-password interstitial
 *   with HTTP 200 JSON, so a reader that looks only at status and body shape
 *   calls it a perfectly good settings payload, finds no trusted-publisher
 *   block in it, and reports the package `unreadable` while the operator is
 *   still typing their code. Only an authenticated page that settled on the
 *   access URL may read as `ready`, which is the only state the payload reader
 *   accepts.
 */

import { describe, expect, test } from 'vitest'

import {
  classifyAccessPageReadiness,
  formatOperatorWait,
  formatOperatorWaitTimeout,
  hasAccessPageMarkers,
  hasSignInMarkers,
  isAccessPageUrl,
  isOperatorClearableReadiness,
  isOperatorSignInUrl,
  OPERATOR_POLL_MS,
  WAIT_FOR_OPERATOR_MS,
} from '../../../scripts/npm/configure-staged-publishing-session.mts'

const ACCESS_URL = 'https://www.npmjs.com/package/@socketregistry/abab/access'
const LOGIN_URL =
  'https://www.npmjs.com/login?next=%2Fpackage%2F%40socketregistry%2Fabab%2Faccess'

// The spiferack payload a signed-in access page answers with.
const ACCESS_PAYLOAD = JSON.stringify({
  context: {
    oidcConnections: [
      {
        config: {
          environment_name: 'npm-publish',
          repository_name: 'socket-registry',
          repository_owner: 'SocketDev',
          workflow: 'npm-publish-packages.yml',
        },
        permissions: ['createStagedPackage'],
      },
    ],
  },
})

// What npm hands back mid-sign-in: HTTP 200, valid JSON, no trusted-publisher
// block, and a signed-out spiferack envelope.
const SIGN_IN_PAYLOAD = '{"context":{"title":"Sign in to npm"},"user":null}'

describe('isAccessPageUrl / isOperatorSignInUrl', () => {
  test('recognizes the package access page', () => {
    expect(isAccessPageUrl(ACCESS_URL)).toBe(true)
    expect(isAccessPageUrl(`${ACCESS_URL}?tab=publishing`)).toBe(true)
    expect(isAccessPageUrl('https://www.npmjs.com/package/@x/y')).toBe(false)
    expect(isAccessPageUrl(undefined)).toBe(false)
  })

  test('recognizes the states only a person can move off', () => {
    expect(isOperatorSignInUrl(LOGIN_URL)).toBe(true)
    expect(isOperatorSignInUrl('https://www.npmjs.com/login')).toBe(true)
    expect(isOperatorSignInUrl('https://www.npmjs.com/verify')).toBe(true)
    expect(isOperatorSignInUrl('https://www.npmjs.com/otp')).toBe(true)
    expect(isOperatorSignInUrl('https://www.npmjs.com/two-factor')).toBe(true)
    expect(
      isOperatorSignInUrl('https://www.npmjs.com/challenge?ref=access'),
    ).toBe(true)
  })

  test('the access page is never a sign-in URL, whatever the package is named', () => {
    expect(isOperatorSignInUrl(ACCESS_URL)).toBe(false)
    // A package whose NAME carries one of the interstitial words must not read
    // as an interstitial and strand the run in a wait it can never leave.
    expect(
      isOperatorSignInUrl(
        'https://www.npmjs.com/package/@socketregistry/otp/access',
      ),
    ).toBe(false)
    expect(
      isOperatorSignInUrl(
        'https://www.npmjs.com/package/@socketregistry/challenge/access',
      ),
    ).toBe(false)
  })
})

describe('hasAccessPageMarkers / hasSignInMarkers', () => {
  test('access-page content is recognized', () => {
    expect(hasAccessPageMarkers(ACCESS_PAYLOAD)).toBe(true)
    expect(hasAccessPageMarkers('<h2>Trusted Publisher</h2>')).toBe(true)
    expect(hasAccessPageMarkers('')).toBe(false)
  })

  test('a signed-out envelope and a login form are sign-in markers', () => {
    expect(hasSignInMarkers(SIGN_IN_PAYLOAD)).toBe(true)
    expect(
      hasSignInMarkers('<form action="/login" method="post"></form>'),
    ).toBe(true)
    expect(hasSignInMarkers('<input name="password" type="password">')).toBe(
      true,
    )
    expect(
      hasSignInMarkers('<input name="otp" autocomplete="one-time-code">'),
    ).toBe(true)
  })

  test('the access page’s own two-factor copy is not a sign-in marker', () => {
    // The access page renders a "Require two-factor authentication" publishing
    // option, so any two-factor WORDING would match the very page being waited
    // for and the wait would never end.
    const body =
      '<h2>Trusted Publisher</h2><label>Require two-factor authentication or automation tokens</label>'
    expect(hasSignInMarkers(body)).toBe(false)
  })
})

describe('classifyAccessPageReadiness', () => {
  test('the settled access page is ready', () => {
    expect(
      classifyAccessPageReadiness({
        body: ACCESS_PAYLOAD,
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('ready')
  })

  test('a sign-in interstitial served as 200 JSON is sign-in, never ready', () => {
    // The live failure: status 200 and valid JSON, so a status-and-shape reader
    // called it a settings payload and reported the package unreadable.
    expect(
      classifyAccessPageReadiness({
        body: SIGN_IN_PAYLOAD,
        fetchUrl: LOGIN_URL,
        pageUrl: LOGIN_URL,
        status: 200,
      }),
    ).toBe('sign-in')
  })

  test('a one-time-password page in the window is sign-in even when the fetch answers 200', () => {
    expect(
      classifyAccessPageReadiness({
        body: SIGN_IN_PAYLOAD,
        fetchUrl: ACCESS_URL,
        pageUrl: 'https://www.npmjs.com/login/otp',
        status: 200,
      }),
    ).toBe('sign-in')
  })

  test('a signed-out envelope at the access URL is sign-in, not unreadable', () => {
    expect(
      classifyAccessPageReadiness({
        body: SIGN_IN_PAYLOAD,
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('sign-in')
  })

  test('a login page server-rendered at the access URL is sign-in, not a challenge', () => {
    expect(
      classifyAccessPageReadiness({
        body: '<html><body><form action="/login" method="post"></form></body></html>',
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('sign-in')
  })

  test('a Cloudflare interstitial is a challenge', () => {
    expect(
      classifyAccessPageReadiness({
        body: '<html><head><title>Just a moment…</title></head></html>',
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('challenge')
  })

  test('a destroyed execution context is unsettled, not an error', () => {
    // status 0 is the mid-navigation race the in-page fetch reports; failing on
    // it would abort a package for a page that was merely reloading.
    expect(
      classifyAccessPageReadiness({
        body: '',
        fetchUrl: '',
        pageUrl: ACCESS_URL,
        status: 0,
      }),
    ).toBe('unsettled')
  })

  test('a 200 that landed somewhere other than the access page is unsettled', () => {
    expect(
      classifyAccessPageReadiness({
        body: '{"ok":true}',
        fetchUrl: 'https://www.npmjs.com/settings/socket-bot/packages',
        pageUrl: 'https://www.npmjs.com/settings/socket-bot/packages',
        status: 200,
      }),
    ).toBe('unsettled')
  })

  test('a refused session is auth and a server failure is error', () => {
    expect(
      classifyAccessPageReadiness({
        body: '{}',
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 403,
      }),
    ).toBe('auth')
    expect(
      classifyAccessPageReadiness({
        body: '{}',
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 500,
      }),
    ).toBe('error')
  })
})

describe('isOperatorClearableReadiness', () => {
  test('only the states a person clears in the window pause the run', () => {
    expect(isOperatorClearableReadiness('challenge')).toBe(true)
    expect(isOperatorClearableReadiness('sign-in')).toBe(true)
    expect(isOperatorClearableReadiness('unsettled')).toBe(true)
    expect(isOperatorClearableReadiness('ready')).toBe(false)
    expect(isOperatorClearableReadiness('auth')).toBe(false)
    expect(isOperatorClearableReadiness('error')).toBe(false)
  })
})

describe('operator wait timings', () => {
  test('the budget is sized for a person, not a machine', () => {
    // An unhurried one-time password: find the authenticator, mistype once, try
    // again. Anything under a few minutes is a machine's patience, not a
    // person's.
    expect(WAIT_FOR_OPERATOR_MS).toBeGreaterThanOrEqual(5 * 60_000)
    expect(OPERATOR_POLL_MS).toBeGreaterThanOrEqual(1000)
    expect(OPERATOR_POLL_MS).toBeLessThan(WAIT_FOR_OPERATOR_MS)
  })
})

describe('operator-facing messages', () => {
  test('the wait line reports elapsed time, remaining time, and what to do', () => {
    const line = formatOperatorWait({
      budgetMs: 600_000,
      elapsedMs: 30_000,
      readiness: 'sign-in',
      url: ACCESS_URL,
    })
    expect(line).toContain('30s elapsed')
    expect(line).toContain('570s before this run gives up')
    expect(line).toContain('one-time password')
    expect(line).toContain('Chrome window')
    expect(line).toContain('nothing is written')
  })

  test('the wait line names the reason for each pausing state', () => {
    const of = (readiness: 'challenge' | 'sign-in' | 'unsettled') =>
      formatOperatorWait({
        budgetMs: 600_000,
        elapsedMs: 0,
        readiness,
        url: ACCESS_URL,
      })
    expect(of('sign-in')).toContain('sign-in / one-time-password page')
    expect(of('challenge')).toContain('human-verification challenge')
    expect(of('unsettled')).toContain('not settled on the access page')
  })

  test('the timeout block is What / Where / Saw / Wanted / Fix and says nothing was written', () => {
    const block = formatOperatorWaitTimeout({
      budgetMs: 600_000,
      readiness: 'sign-in',
      url: ACCESS_URL,
    })
    const lines = block.split('\n')
    expect(lines[0]).toMatch(/^What: /)
    expect(lines[1]).toMatch(/^Where: /)
    expect(lines[2]).toMatch(/^Saw: /)
    expect(lines[3]).toMatch(/^Wanted: /)
    expect(lines[4]).toMatch(/^Fix: /)
    expect(block).toContain(ACCESS_URL)
    expect(block).toContain('600s')
    expect(block).toContain('Nothing was written')
  })
})
