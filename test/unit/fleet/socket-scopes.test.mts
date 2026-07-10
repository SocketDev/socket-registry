// vitest specs for scripts/fleet/constants/socket-scopes.mts — the canonical
// Socket-owned package/repo patterns shared by the soak surfaces, plus the
// security invariant that forbids an unscoped prefix glob.

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  assertNoUnscopedWildcard,
  isSocketSourcedPackage,
  isSocketSourcedRepository,
  SOCKET_PACKAGE_PATTERNS,
  SOCKET_SCOPES,
} from '../../../scripts/fleet/constants/socket-scopes.mts'

describe('socket-scopes / assertNoUnscopedWildcard', () => {
  test('passes for scoped globs and exact names', () => {
    assert.doesNotThrow(() =>
      assertNoUnscopedWildcard('t', [
        '@socketsecurity/*',
        'ecc-agentshield',
        'sfw',
      ]),
    )
  })

  test('throws for an unscoped prefix glob, naming the list + offender', () => {
    assert.throws(
      () => assertNoUnscopedWildcard('MY_LIST', ['socket-*']),
      /MY_LIST entry "socket-\*" is an unscoped/,
    )
  })

  test('both shipped lists are clean (load-time invariant already ran)', () => {
    // Importing the module ran the two assertNoUnscopedWildcard() calls; if a
    // `socket-*` had slipped into either list the import above would have thrown.
    assert.doesNotThrow(() =>
      assertNoUnscopedWildcard(
        'SOCKET_PACKAGE_PATTERNS',
        SOCKET_PACKAGE_PATTERNS,
      ),
    )
    assert.doesNotThrow(() =>
      assertNoUnscopedWildcard('SOCKET_SCOPES', SOCKET_SCOPES),
    )
  })
})

describe('socket-scopes / SOCKET_SCOPES (taze cadence list)', () => {
  test('lists non-namespaced Socket pkgs by exact name, never a socket-* glob', () => {
    assert.ok(SOCKET_SCOPES.includes('ecc-agentshield'))
    assert.ok(SOCKET_SCOPES.includes('sfw'))
    assert.ok(!SOCKET_SCOPES.includes('socket-*'))
    // socket-mcp is NOT listed: the published package is @socketsecurity/mcp
    // (under the @socketsecurity/* glob); a bare `socket-mcp` is a name we
    // don't own, so listing it would soak/cooldown-bypass an attacker's pkg.
    assert.ok(!SOCKET_SCOPES.includes('socket-mcp'))
  })

  test('every wildcard entry is scoped', () => {
    for (const pattern of SOCKET_SCOPES) {
      if (pattern.includes('*')) {
        assert.ok(
          pattern.startsWith('@'),
          `unscoped wildcard "${pattern}" would bypass the maturity cooldown`,
        )
      }
    }
  })
})

describe('socket-scopes / SOCKET_PACKAGE_PATTERNS security invariant', () => {
  test('contains NO unscoped wildcard (a socket-* glob is a soak-bypass hole)', () => {
    for (const pattern of SOCKET_PACKAGE_PATTERNS) {
      if (pattern.includes('*')) {
        assert.ok(
          pattern.startsWith('@'),
          `unscoped wildcard "${pattern}" would soak-bypass any attacker-published match`,
        )
      }
    }
  })
})

describe('socket-scopes / isSocketSourcedPackage', () => {
  test('scoped glob matches any member of an owned scope', () => {
    assert.ok(isSocketSourcedPackage('@socketsecurity/lib'))
    assert.ok(isSocketSourcedPackage('pkg:npm/@socketsecurity/lib@6.0.6'))
    assert.ok(isSocketSourcedPackage('@sdxgen/cli'))
    assert.ok(isSocketSourcedPackage('@stuie/core'))
    assert.ok(isSocketSourcedPackage('@ultrathink/acorn'))
  })

  test('unscoped Socket packages match by EXACT name', () => {
    assert.ok(isSocketSourcedPackage('socket'))
    assert.ok(isSocketSourcedPackage('sfw'))
    assert.ok(isSocketSourcedPackage('sdxgen'))
    assert.ok(isSocketSourcedPackage('stuie'))
  })

  test('@socketdev is NOT Socket-owned (removed from the soak-bypass)', () => {
    // @socketdev/* was dropped — packages under it go through the normal soak.
    assert.ok(!isSocketSourcedPackage('@socketdev/anything'))
  })

  test('an attacker-published socket-prefixed name is NOT sourced', () => {
    // The whole point of dropping the `socket-*` prefix glob.
    assert.ok(!isSocketSourcedPackage('socket-evil'))
    assert.ok(!isSocketSourcedPackage('socket-malware'))
    // Deprecated/renamed packages are not in the list either.
    assert.ok(!isSocketSourcedPackage('socket-cli'))
  })

  test('a plain third-party package is not sourced', () => {
    assert.ok(!isSocketSourcedPackage('left-pad'))
    assert.ok(!isSocketSourcedPackage('@yuku-parser/binding-darwin-arm64'))
  })
})

describe('socket-scopes / isSocketSourcedRepository', () => {
  test('SocketDev-owned repo (prefixed or bare, case-insensitive)', () => {
    assert.ok(isSocketSourcedRepository('github:SocketDev/sfw-free'))
    assert.ok(isSocketSourcedRepository('SocketDev/firewall-release'))
    assert.ok(isSocketSourcedRepository('github:socketdev/x'))
  })

  test('a non-Socket repo is not sourced', () => {
    assert.ok(!isSocketSourcedRepository('github:evil/repo'))
    assert.ok(!isSocketSourcedRepository('rust-lang/regex'))
  })
})
