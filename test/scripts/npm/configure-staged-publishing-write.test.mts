/**
 * @file Tests for the in-place write's pure verify contract. Success is the
 *   page's own answer, never the click, so this is where "the save landed" is
 *   actually decided — and the case that matters most is the one the old
 *   verify could not see: a save that added the staged grant but left the
 *   direct one in place, which is a package that still publishes without an
 *   approval step.
 */

import { describe, expect, test } from 'vitest'

import { verifyStagedPayload } from '../../../scripts/npm/configure-staged-publishing-write.mts'

import type { TrustedPublisherDesired } from '../../../scripts/fleet/publish-infra/npm/trusted-publisher-plan.mts'

const DESIRED: TrustedPublisherDesired = {
  allowNpmPublish: false,
  allowNpmStagePublish: true,
  environmentName: 'npm-publish',
  repositoryName: 'socket-registry',
  repositoryOwner: 'SocketDev',
  workflowFilename: 'npm-publish-packages.yml',
}

function payloadWithPermissions(permissions: readonly string[]): unknown {
  return {
    context: {
      oidcConnections: [
        {
          config: {
            environment_name: 'npm-publish',
            repository_name: 'socket-registry',
            repository_owner: 'SocketDev',
            workflow: 'npm-publish-packages.yml',
          },
          permissions,
        },
      ],
    },
  }
}

describe('verifyStagedPayload', () => {
  test('a stage-only save verifies clean', () => {
    expect(
      verifyStagedPayload(
        payloadWithPermissions(['createStagedPackage']),
        DESIRED,
      ),
    ).toEqual([])
  })

  test('a save that left the direct grant in place does NOT verify', () => {
    const mismatches = verifyStagedPayload(
      payloadWithPermissions(['createStagedPackage', 'createPackageVersion']),
      DESIRED,
    )
    expect(mismatches).toContain('"npm publish" is still allowed')
  })

  test('a save missing the staged grant does not verify', () => {
    const mismatches = verifyStagedPayload(
      payloadWithPermissions(['createPackageVersion']),
      DESIRED,
    )
    expect(mismatches).toContain('"npm stage publish" is still not allowed')
  })

  test('a binding that landed elsewhere is named', () => {
    const mismatches = verifyStagedPayload(
      {
        context: {
          oidcConnections: [
            {
              config: {
                environment_name: 'npm-publish',
                repository_name: 'socket-registry',
                repository_owner: 'SocketDev',
                workflow: 'npm-publish.yml',
              },
              permissions: ['createStagedPackage'],
            },
          ],
        },
      },
      DESIRED,
    )
    expect(mismatches).toContain('the saved binding does not match the target')
  })

  test('an unreadable re-read is a failure, never a pass', () => {
    // A verify that cannot read the page must not report success: the whole
    // contract is that the PAGE answers, so no answer is no.
    expect(verifyStagedPayload(undefined, DESIRED)).toEqual([
      'the re-read reported the trusted-publisher block as unreadable',
    ])
  })
})
