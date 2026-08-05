/**
 * @file Tests for the permission half of the staged-publishing configurator:
 *   which of npm's grant tokens map to which rendered action, and the registry
 *   evidence the run demands before it takes a grant away.
 *   Both matter for the same reason. Stage-only is the target policy, so the
 *   run CLEARS "npm publish" rather than leaving it alone — and a grant spelled
 *   in a way the action table does not know simply disappears from the action
 *   set, which reads as a package already narrowed when it is not. Getting that
 *   wrong in one direction skips a package that still publishes without an
 *   approval step; in the other it removes a permission on no evidence at all.
 */

import { describe, expect, test } from 'vitest'

import {
  countConnectionPermissionTokens,
  decideStagedConfigurationState,
  findUnmappedPermissionTokens,
  formatMissingPackumentEvidence,
  grantTokensForAction,
  hasPackumentEvidence,
  isWriteState,
  permitsStagedPublish,
  planStagedConfiguration,
  readAllowedActions,
  readConnectionPermissionTokens,
  readTrustedPublisherState,
  resolvePermissionAction,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_WORKFLOW_FILENAME,
} from '../../../scripts/npm/configure-staged-publishing-plan.mts'

import { normalizePayloadKey } from '../../../scripts/npm/configure-staged-publishing-payload.mts'

import type { StagedTrustReport } from '../../../scripts/npm/check-trusted-packages-staged.mts'

// One npm access-page payload carrying a single live trusted-publisher
// connection, in the shape npm's own `oidcConnections` list uses.
function payloadWithConnection(config: {
  permissions?: string[] | undefined
}): unknown {
  return {
    context: {
      oidcConnections: [
        {
          config: {
            environment_name: TARGET_ENVIRONMENT_NAME,
            repository_name: TARGET_REPOSITORY_NAME,
            repository_owner: 'SocketDev',
            workflow: TARGET_WORKFLOW_FILENAME,
          },
          permissions: config.permissions ?? ['createStagedPackage'],
        },
      ],
    },
  }
}

function reportOf(
  name: string,
  verdict: StagedTrustReport['verdict'],
  latestVersion?: string | undefined,
): StagedTrustReport {
  return {
    latestVersion,
    manifestVersion: undefined,
    manifestVersionIsPublished: latestVersion !== undefined,
    name,
    publishedVersionCount: latestVersion === undefined ? 0 : 1,
    stagedVersionCount: verdict === 'staged' ? 1 : 0,
    verdict,
  }
}

describe('permission tokens', () => {
  test('the rendered spellings map as well as the payload’s own', () => {
    // The fleet map covers npm's `createStagedPackage` / `createPackageVersion`
    // pair. The FORM's spellings arrive in some payloads too, and a grant this
    // table does not know disappears from the action set — which reads as a
    // package already narrowed when it is not.
    expect(resolvePermissionAction('createStagedPackage')).toBe(
      'npm stage publish',
    )
    expect(resolvePermissionAction('createPackageVersion')).toBe('npm publish')
    expect(resolvePermissionAction('npm publish')).toBe('npm publish')
    expect(resolvePermissionAction('npm stage publish')).toBe(
      'npm stage publish',
    )
    expect(resolvePermissionAction('stage-publish')).toBe('npm stage publish')
    expect(resolvePermissionAction('publishStaged')).toBe('npm stage publish')
    expect(resolvePermissionAction('publish')).toBe('npm publish')
  })

  test('npm’s own createPackage token reads as the direct-publish grant', () => {
    // `createPackage` is the spelling npm's trust API and `npm trust` CLI use
    // for a direct publish. Without it, a live connection carrying that grant
    // maps to nothing, the action set comes back staged-only, and the package
    // reads as already narrowed while it can still publish without approval.
    expect(resolvePermissionAction('createPackage')).toBe('npm publish')
    const reading = readTrustedPublisherState(
      payloadWithConnection({
        permissions: ['createPackage', 'createStagedPackage'],
      }),
    )
    expect([...reading.actions!].toSorted()).toEqual([
      'npm publish',
      'npm stage publish',
    ])
    expect(decideStagedConfigurationState(reading)).toBe('narrow')
  })

  test('every spelling of one action is offered to the control resolver', () => {
    // The form can identify a grant by a control's VALUE rather than by a field
    // name, so the resolver needs the same vocabulary the payload reader has.
    // Some spellings arrive already normalized, which is fine: the resolver
    // compares tokens with the same letters-and-digits normalization, so
    // `createpackage` matches a control carrying `createPackage`.
    const direct = grantTokensForAction('npm publish')
    for (const token of [
      'npm publish',
      'createPackage',
      'createPackageVersion',
      'publish',
    ]) {
      expect(direct.map(normalizePayloadKey)).toContain(
        normalizePayloadKey(token),
      )
    }
    const staged = grantTokensForAction('npm stage publish')
    for (const token of [
      'npm stage publish',
      'createStagedPackage',
      'stagePublish',
    ]) {
      expect(staged.map(normalizePayloadKey)).toContain(
        normalizePayloadKey(token),
      )
    }
    expect(direct.map(normalizePayloadKey)).not.toContain(
      normalizePayloadKey('createStagedPackage'),
    )
  })

  test('a grant nothing recognizes stays unmapped rather than being guessed at', () => {
    expect(resolvePermissionAction('createOrganization')).toBeUndefined()
  })

  test('the token count is exact, and the unmapped ones are named', () => {
    // The count alone never proved anything: two tokens mapping to the SAME
    // action also shrink the action set, so `tokens > actions` could fire with
    // nothing unmapped at all.
    const payload = payloadWithConnection({
      permissions: ['npm publish', 'npm stage publish'],
    })
    expect(countConnectionPermissionTokens(payload)).toBe(2)
    expect(readConnectionPermissionTokens(payload)).toEqual([
      'npm publish',
      'npm stage publish',
    ])
    expect(findUnmappedPermissionTokens(payload)).toEqual([])
    expect(
      findUnmappedPermissionTokens(
        payloadWithConnection({ permissions: ['createOrganization'] }),
      ),
    ).toEqual(['createOrganization'])
  })

  test('the literal form spellings read as both grants present', () => {
    // Both audited packages carry the direct grant beside the staged one. Read
    // through the form's own spellings, that has to land on `narrow`.
    const reading = readTrustedPublisherState(
      payloadWithConnection({
        permissions: ['npm publish', 'npm stage publish'],
      }),
    )
    expect([...reading.actions!].toSorted()).toEqual([
      'npm publish',
      'npm stage publish',
    ])
    expect(decideStagedConfigurationState(reading)).toBe('narrow')
  })
})

describe('direct-publish clearing evidence', () => {
  test('a package the registry answered for may be narrowed', () => {
    const [target] = planStagedConfiguration([
      reportOf('@socketregistry/abab', 'not-staged', '1.0.9'),
    ])
    expect(hasPackumentEvidence(target!)).toBe(true)
  })

  test('a package with no published version is never narrowed', () => {
    // A permission taken away on an empty packument read is not recoverable by
    // re-running, so the assertion is the cheap side of a one-sided cost.
    expect(
      hasPackumentEvidence({
        latestVersion: undefined,
        name: '@socketregistry/nothing',
        publishedVersionCount: 0,
        settingsUrl:
          'https://www.npmjs.com/package/@socketregistry/nothing/access',
      }),
    ).toBe(false)
  })

  test('the refusal block follows What / Where / Saw / Wanted / Fix', () => {
    const lines = formatMissingPackumentEvidence({
      latestVersion: undefined,
      name: '@socketregistry/nothing',
      publishedVersionCount: 0,
      settingsUrl:
        'https://www.npmjs.com/package/@socketregistry/nothing/access',
    }).split('\n')
    expect(lines[0]).toMatch(/^What: /)
    expect(lines[1]).toMatch(/^Where: /)
    expect(lines[2]).toMatch(/^Saw: /)
    expect(lines[3]).toMatch(/^Wanted: /)
    expect(lines[4]).toMatch(/^Fix: /)
  })

  test('an allowed-actions block with no connections list is rebind, never skip', () => {
    // The publisher exists but the payload never says what it points at, so the
    // whole form gets rewritten rather than trusted.
    const reading = readTrustedPublisherState({
      trustedPublisher: { allowedActions: ['npm stage publish'] },
    })
    expect(reading.blockState).toBe('present')
    expect(reading.binding).toBeUndefined()
    expect(decideStagedConfigurationState(reading)).toBe('rebind')
  })

  test('an unrecognized payload stops the run rather than reading as create', () => {
    for (const payload of [undefined, 'a string', { some: 'other page' }]) {
      const reading = readTrustedPublisherState(payload)
      expect(reading.blockState).toBe('unreadable')
      expect(decideStagedConfigurationState(reading)).toBe('unreadable')
    }
  })
})

describe('readAllowedActions', () => {
  test('reads an array of action tokens', () => {
    const actions = readAllowedActions({
      trustedPublisher: {
        allowedActions: ['npm publish', 'npm stage publish'],
      },
    })
    expect(actions).toBeDefined()
    expect(permitsStagedPublish(actions!)).toBe(true)
  })

  test('reads a boolean map keyed by action token', () => {
    const actions = readAllowedActions({
      package: {
        trustedPublisher: {
          allowedActions: { stagePublish: true, publish: false },
        },
      },
    })
    expect(actions).toBeDefined()
    expect(permitsStagedPublish(actions!)).toBe(true)
  })

  test('an unrecognized payload is undefined, never an empty set', () => {
    expect(
      readAllowedActions({ some: 'other', page: { of: 'json' } }),
    ).toBeUndefined()
    expect(readAllowedActions(undefined)).toBeUndefined()
    expect(readAllowedActions('a string')).toBeUndefined()
  })
})

describe('write states', () => {
  test('every write state writes; skip and unreadable do not', () => {
    expect(isWriteState('narrow')).toBe(true)
    expect(isWriteState('configure')).toBe(true)
    expect(isWriteState('create')).toBe(true)
    expect(isWriteState('rebind')).toBe(true)
    expect(isWriteState('skip')).toBe(false)
    expect(isWriteState('unreadable')).toBe(false)
  })
})
