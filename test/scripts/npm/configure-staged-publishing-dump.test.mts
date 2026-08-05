/**
 * @file Tests for the `--dump-payload` diagnostic's pure renderer. The
 *   load-bearing property is REDACTION: the whole point of dumping a key tree
 *   instead of the payload is that npm's access payload carries the page CSRF
 *   token, the signed-in account's email, and maintainer names, so a string
 *   value escaping into the output is a credential leak, not a formatting bug.
 *   Every fixture here is invented; the SHAPES come from the real dump taken
 *   against `@socketregistry/abab` on 2026-08-05, which is how the two-factor
 *   step-up was identified.
 */

import { describe, expect, test } from 'vitest'

import {
  describePayloadKeyTree,
  describeValueType,
  findPayloadKeyPaths,
} from '../../../scripts/npm/configure-staged-publishing-dump.mts'

// The shape npm answered the access URL with while a two-factor step-up was
// outstanding. Keys real, values invented. Built through JSON.parse because
// that is exactly how the payload reaches the renderer in production — the
// `null`s below are npm's, not a TypeScript authoring choice.
const ESCALATION_PAYLOAD: unknown = JSON.parse(`{
  "action": "challenge",
  "alertBanners": [
    {
      "id": "invented-banner-id",
      "level": "notice",
      "message": "invented banner copy",
      "skipXSSEscaping": true,
      "duration": null,
      "dismissalCookie": "invented-cookie-name"
    }
  ],
  "auditLogEnabled": false,
  "csrftoken": "invented-csrf-token-value-not-a-real-one",
  "darkThemeEnabled": true,
  "disable2faPasswordOption": false,
  "errorCount": 0,
  "escalateType": "totp",
  "hasTotp": true,
  "hasWebAuthnDevices": false,
  "notifications": [],
  "originalUrl": "/package/@socketregistry/abab/access",
  "publicKeyCredentialRequestOptions": null,
  "stagedPublishingEnabled": true,
  "user": {
    "avatars": { "large": "invented", "medium": "invented", "small": "invented" },
    "name": "invented-user",
    "resource": { "fullname": "invented", "github": "invented" }
  },
  "userEmailVerified": true
}`)

// The shape a settled access page answers with, for contrast.
const ACCESS_PAYLOAD = {
  canEditPackage: true,
  csrftoken: 'invented-csrf-token',
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
  package: '@socketregistry/abab',
}

describe('describeValueType', () => {
  test('reports a string as a length and never as its contents', () => {
    expect(describeValueType('super-secret-token')).toBe('string(len=18)')
    expect(describeValueType('super-secret-token')).not.toContain('secret')
    expect(describeValueType('')).toBe('string(len=0)')
  })

  test('reports arrays by length and objects by key count', () => {
    expect(describeValueType([1, 2, 3])).toBe('array(len=3)')
    expect(describeValueType([])).toBe('array(len=0)')
    expect(describeValueType({ a: 1, b: 2 })).toBe('object(2 keys)')
  })

  test('prints booleans and numbers in full — neither can carry a credential', () => {
    expect(describeValueType(true)).toBe('boolean(true)')
    expect(describeValueType(false)).toBe('boolean(false)')
    expect(describeValueType(0)).toBe('number(0)')
    expect(describeValueType(JSON.parse('null'))).toBe('null')
    expect(describeValueType(undefined)).toBe('undefined')
  })
})

describe('describePayloadKeyTree', () => {
  test('prints every key name of the escalation payload', () => {
    const out = describePayloadKeyTree(ESCALATION_PAYLOAD).join('\n')
    for (const key of [
      'escalateType',
      'hasTotp',
      'hasWebAuthnDevices',
      'disable2faPasswordOption',
      'publicKeyCredentialRequestOptions',
      'originalUrl',
      'errorCount',
    ]) {
      expect(out).toContain(key)
    }
  })

  test('leaks no string value, including the csrf token and the account name', () => {
    const out = describePayloadKeyTree(ESCALATION_PAYLOAD).join('\n')
    expect(out).toContain('csrftoken: string(len=40)')
    expect(out).not.toContain('invented-csrf-token-value-not-a-real-one')
    expect(out).not.toContain('invented-user')
    expect(out).not.toContain('totp')
    expect(out).not.toContain('/package/@socketregistry/abab/access')
  })

  test('descends into nested objects and array items', () => {
    const out = describePayloadKeyTree(ESCALATION_PAYLOAD).join('\n')
    expect(out).toContain('user: object(3 keys)')
    expect(out).toContain('  name: string(len=13)')
    expect(out).toContain('alertBanners: array(len=1)')
    expect(out).toContain('  [0]: object(6 keys)')
    expect(out).toContain('duration: null')
  })

  test('reports an array full length even when it truncates the items shown', () => {
    const lines = describePayloadKeyTree(
      { rows: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }] },
      { maxArrayItems: 2 },
    ).join('\n')
    expect(lines).toContain('rows: array(len=5)')
    expect(lines).toContain('[1]:')
    expect(lines).not.toContain('[2]:')
    expect(lines).toContain('…(3 more item(s))')
  })

  test('reports an object full key count even when it truncates the keys shown', () => {
    const lines = describePayloadKeyTree(
      { a: 1, b: 2, c: 3, d: 4 },
      { maxKeys: 2 },
    ).join('\n')
    expect(lines).toContain('…(2 more key(s))')
  })

  test('stops at the depth limit rather than recursing forever', () => {
    const deep = { l1: { l2: { l3: { l4: { l5: 'x' } } } } }
    const lines = describePayloadKeyTree(deep, { maxDepth: 3 }).join('\n')
    expect(lines).toContain('l1:')
    expect(lines).toContain('depth limit')
    expect(lines).not.toContain('l5')
  })

  test('survives a cycle instead of spinning', () => {
    const node: Record<string, unknown> = { name: 'root' }
    node['self'] = node
    const lines = describePayloadKeyTree(node).join('\n')
    expect(lines).toContain('…(cycle)')
  })

  test('renders a non-object payload as a bare root line', () => {
    expect(describePayloadKeyTree(JSON.parse('null'))).toEqual(['<root>: null'])
    expect(describePayloadKeyTree('secret')).toEqual(['<root>: string(len=6)'])
  })
})

describe('findPayloadKeyPaths', () => {
  test('finds the connections list by dotted path and reports its length', () => {
    const paths = findPayloadKeyPaths(
      ACCESS_PAYLOAD,
      /oidc|workflow|repositor/i,
    )
    expect(paths).toContain('oidcConnections: array(len=1)')
    expect(paths).toContain(
      'oidcConnections[0].config.repository_name: string(len=15)',
    )
    expect(paths).toContain(
      'oidcConnections[0].config.workflow: string(len=24)',
    )
  })

  test('finds a connections list nested under a wrapper key', () => {
    const paths = findPayloadKeyPaths(
      { context: { oidcConnections: [] } },
      /oidcConnections/,
    )
    expect(paths).toEqual(['context.oidcConnections: array(len=0)'])
  })

  test('reports paths only, never the value behind them', () => {
    const paths = findPayloadKeyPaths(ACCESS_PAYLOAD, /csrf/i).join('\n')
    expect(paths).toContain('csrftoken: string(len=19)')
    expect(paths).not.toContain('invented-csrf-token')
  })

  test('returns nothing when the payload carries no matching key', () => {
    expect(findPayloadKeyPaths(ESCALATION_PAYLOAD, /oidcConnections/)).toEqual(
      [],
    )
  })

  test('is not confused by a sticky regex reusing its lastIndex', () => {
    const paths = findPayloadKeyPaths({ a: { a: 1 }, b: 2 }, /a/g)
    expect(paths).toContain('a: object(1 keys)')
    expect(paths).toContain('a.a: number(1)')
  })
})
