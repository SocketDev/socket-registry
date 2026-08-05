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
  hasTwoFactorEscalationMarkers,
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

  test('a Cloudflare interstitial is a challenge, in every spelling', () => {
    // The interstitial title arrives with a Unicode ellipsis, with three ASCII
    // dots, with nothing, and in any case. Each is the same phrase, so each has
    // to reach the same verdict.
    for (const title of [
      'Just a moment…',
      'Just a moment…',
      'Just a moment',
      'JUST A MOMENT…',
    ]) {
      expect(
        classifyAccessPageReadiness({
          body: `<html><head><title>${title}</title></head></html>`,
          fetchUrl: ACCESS_URL,
          pageUrl: ACCESS_URL,
          status: 200,
        }),
      ).toBe('challenge')
    }
  })

  test('an access page carrying npm’s notice banners is ready, not a challenge', () => {
    // The live false positive: a rendered access page with the 2026 two-factor
    // token-restriction warning on it. The run announced "waiting on human
    // verification" and burned its whole budget with the trusted-publisher form
    // sitting open underneath.
    expect(
      classifyAccessPageReadiness({
        body:
          '<div role="alert" class="alert alert-warning">npm tokens that bypass 2FA are being ' +
          `restricted — account changes (Aug 2026) and direct publishing (Jan 2027)</div>${ACCESS_PAYLOAD}`,
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('ready')
  })

  test('a provenance-fetch-failure banner is ready too', () => {
    expect(
      classifyAccessPageReadiness({
        body:
          '<div class="banner banner-error">Failed to fetch provenance details for ' +
          `@socketregistry/abab@1.0.9. Please try reloading the page.</div>${ACCESS_PAYLOAD}`,
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('ready')
  })

  test('the rendered trusted-publisher form is ready even served as HTML', () => {
    // The page in the screenshot: the form one click away, on a full HTML
    // document. A bare "HTML where JSON was expected" reading filed that under
    // Cloudflare and paused for a person who had nothing to do.
    expect(
      classifyAccessPageReadiness({
        body: '<html><body><input name="workflowName" value="npm-publish.yml"></body></html>',
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('ready')
  })

  test('a two-factor step-up at the access URL is still the step-up', () => {
    // Payload-presence-first must not weaken this: npm serves the step-up AT
    // the access URL as a 200 to a signed-in session, and reading it as
    // settings reports a configured package as having no publisher at all.
    expect(
      classifyAccessPageReadiness({
        body: '{"escalateType":"webauthn","hasTotp":true,"originalUrl":"/package/x/access"}',
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('two-factor')
  })

  test('an account’s WebAuthn posture on a settings payload is not a step-up', () => {
    // npm is tightening two-factor across the site. A settings payload that
    // starts reporting the account's WebAuthn devices must not read as an
    // escalation forever after.
    expect(
      hasTwoFactorEscalationMarkers(
        `{"hasWebAuthnDevices":false,"oidcConnections":[]}`,
      ),
    ).toBe(false)
    expect(hasTwoFactorEscalationMarkers('{"hasWebAuthnDevices":false}')).toBe(
      true,
    )
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

describe('two-factor step-up at the access URL', () => {
  // The shape npm actually answered `/package/@socketregistry/abab/access`
  // with on 2026-08-05 while a step-up was outstanding: a 200, at the access
  // URL, for a session whose `user` is fully populated. Keys real (from the
  // `--dump-payload` key tree), values invented.
  const ESCALATION_BODY = `{
    "action": "challenge",
    "csrftoken": "invented-csrf-token",
    "disable2faPasswordOption": false,
    "errorCount": 0,
    "escalateType": "totp",
    "hasTotp": true,
    "hasWebAuthnDevices": false,
    "originalUrl": "/package/@socketregistry/abab/access",
    "publicKeyCredentialRequestOptions": null,
    "stagedPublishingEnabled": true,
    "user": { "name": "invented-user" }
  }`

  test('the step-up payload is recognized by its own keys', () => {
    expect(hasTwoFactorEscalationMarkers(ESCALATION_BODY)).toBe(true)
    expect(hasTwoFactorEscalationMarkers(ACCESS_PAYLOAD)).toBe(false)
    expect(hasTwoFactorEscalationMarkers('')).toBe(false)
  })

  test('each step-up key alone is enough, escaped quotes included', () => {
    for (const key of [
      'escalateType',
      'disable2faPasswordOption',
      'publicKeyCredentialRequestOptions',
      'hasWebAuthnDevices',
    ]) {
      expect(hasTwoFactorEscalationMarkers(`{"${key}": null}`)).toBe(true)
      expect(hasTwoFactorEscalationMarkers(`{\\"${key}\\": null}`)).toBe(true)
    }
  })

  // The misread this whole state exists for: a 200, on the access URL, with a
  // signed-in user. Every other signal says `ready`, and reading the payload
  // then reports a configured package as having no trusted-publisher block.
  test('a 200 step-up on the access URL reads as two-factor, never ready', () => {
    expect(
      classifyAccessPageReadiness({
        body: ESCALATION_BODY,
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('two-factor')
  })

  test('the step-up wins over an access-page marker in the same body', () => {
    expect(
      classifyAccessPageReadiness({
        body: `{"escalateType":"totp","oidcConnections":[]}`,
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('two-factor')
  })

  test('a real access payload still reads as ready', () => {
    expect(
      classifyAccessPageReadiness({
        body: ACCESS_PAYLOAD,
        fetchUrl: ACCESS_URL,
        pageUrl: ACCESS_URL,
        status: 200,
      }),
    ).toBe('ready')
  })

  test('the operator clears a step-up, so the run pauses rather than failing', () => {
    expect(isOperatorClearableReadiness('two-factor')).toBe(true)
  })

  test('the wait line tells the operator a code is wanted, not a login', () => {
    const line = formatOperatorWait({
      budgetMs: 600_000,
      elapsedMs: 0,
      readiness: 'two-factor',
      url: ACCESS_URL,
    })
    expect(line).toContain('signed in')
    expect(line).toContain('two-factor code')
  })
})
