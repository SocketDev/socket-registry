/**
 * @file Tests for the staged-publishing configurator's pure layer: the plan
 *   derived from the check's reports, the per-package state read off npm's
 *   settings payload, and the challenge/sign-in classification. Two cases are
 *   load-bearing. A payload carrying a connections list with no live row must
 *   read as `create` — that is a package with no trusted publisher, the state
 *   that made every staging upload 401 the first time
 *   `npm-publish-packages.yml` ran. A payload the reader cannot recognize at
 *   all must read as `unreadable` and stop the run, never as "nothing
 *   configured", which would send a write at a page nobody has verified.
 */

import { describe, expect, test } from 'vitest'

import {
  bindingMatchesTarget,
  buildPackageAccessUrl,
  classifyStagedFetch,
  decideStagedConfigurationState,
  describeUnreadableCause,
  diffTargetBinding,
  DRY_RUN_PLAN_STATE,
  formatBindingWriteFailure,
  formatStagedPlanLine,
  formatUnreadableSettings,
  isOperatorSignInUrl,
  isTwoFactorEscalationPayload,
  permitsDirectPublish,
  permitsStagedPublish,
  planStagedConfiguration,
  readTrustedPublisherState,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_WORKFLOW_FILENAME,
} from '../../../scripts/npm/configure-staged-publishing-plan.mts'

import type { StagedTrustReport } from '../../../scripts/npm/check-trusted-packages-staged.mts'

// One npm access-page payload carrying a single live trusted-publisher
// connection, in the shape npm's own `oidcConnections` list uses.
function payloadWithConnection(config: {
  deleted?: string | undefined
  environment?: string | undefined
  permissions?: string[] | undefined
  repository?: string | undefined
  workflow?: string | undefined
}): unknown {
  return {
    context: {
      oidcConnections: [
        {
          config: {
            environment_name: config.environment ?? TARGET_ENVIRONMENT_NAME,
            repository_name: config.repository ?? TARGET_REPOSITORY_NAME,
            repository_owner: 'SocketDev',
            workflow: config.workflow ?? TARGET_WORKFLOW_FILENAME,
          },
          deleted: config.deleted,
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

describe('buildPackageAccessUrl / isOperatorSignInUrl', () => {
  test('builds the package settings URL', () => {
    expect(buildPackageAccessUrl('@socketregistry/date')).toBe(
      'https://www.npmjs.com/package/@socketregistry/date/access',
    )
  })

  test('recognizes npm’s sign-in redirect', () => {
    expect(
      isOperatorSignInUrl(
        'https://www.npmjs.com/login?next=%2Fpackage%2F%40socketregistry%2Fdate%2Faccess',
      ),
    ).toBe(true)
    expect(
      isOperatorSignInUrl(
        'https://www.npmjs.com/package/@socketregistry/date/access',
      ),
    ).toBe(false)
  })
})

describe('planStagedConfiguration', () => {
  test('targets only the not-staged reports, sorted', () => {
    const plan = planStagedConfiguration([
      reportOf('@socketregistry/zebra', 'not-staged', '1.0.0'),
      reportOf('@socketregistry/already', 'staged', '1.0.0'),
      reportOf('@socketregistry/abab', 'not-staged', '1.0.9'),
      reportOf('@socketregistry/pending', 'unpublished'),
    ])
    expect(plan.map(t => t.name)).toEqual([
      '@socketregistry/abab',
      '@socketregistry/zebra',
    ])
    expect(plan[0]!.settingsUrl).toBe(
      'https://www.npmjs.com/package/@socketregistry/abab/access',
    )
    expect(plan[0]!.latestVersion).toBe('1.0.9')
  })

  test('a configured package drops out of the plan, making a re-run a no-op', () => {
    const before = planStagedConfiguration([
      reportOf('@socketregistry/date', 'not-staged', '1.0.8'),
    ])
    expect(before).toHaveLength(1)
    const after = planStagedConfiguration([
      reportOf('@socketregistry/date', 'staged', '1.0.9'),
    ])
    expect(after).toHaveLength(0)
  })
})

describe('readTrustedPublisherState / decideStagedConfigurationState', () => {
  test('an empty connections list is create, not unreadable', () => {
    // The 401-on-every-package case: npm knows the package, and knows it has no
    // trusted publisher at all.
    const reading = readTrustedPublisherState({ oidcConnections: [] })
    expect(reading.blockState).toBe('absent')
    expect(reading.binding).toBeUndefined()
    expect(decideStagedConfigurationState(reading)).toBe('create')
  })

  test('npm’s own JSON null for `deleted` reads as a live row', () => {
    // Parsed rather than written as a literal: this is the exact wire shape
    // npm serves, where an unrevoked row carries `"deleted": null`.
    const payload = JSON.parse(
      '{"oidcConnections":[{"config":{"environment_name":"npm-publish",' +
        '"repository_name":"socket-registry","repository_owner":"SocketDev",' +
        '"workflow":"npm-publish-packages.yml"},"deleted":null,' +
        '"permissions":["createStagedPackage"]}]}',
    )
    const reading = readTrustedPublisherState(payload)
    expect(reading.blockState).toBe('present')
    expect(decideStagedConfigurationState(reading)).toBe('skip')
  })

  test('a connections list holding only revoked rows is create', () => {
    const reading = readTrustedPublisherState(
      payloadWithConnection({ deleted: '2026-07-01T00:00:00.000Z' }),
    )
    expect(reading.blockState).toBe('absent')
    expect(decideStagedConfigurationState(reading)).toBe('create')
  })

  test('a block bound to the wrong workflow is rebind', () => {
    const reading = readTrustedPublisherState(
      payloadWithConnection({ workflow: 'npm-publish.yml' }),
    )
    expect(reading.blockState).toBe('present')
    expect(reading.binding?.workflowFilename).toBe('npm-publish.yml')
    expect(decideStagedConfigurationState(reading)).toBe('rebind')
    expect(diffTargetBinding(reading.binding)).toEqual([
      `workflow filename: npm-publish.yml -> ${TARGET_WORKFLOW_FILENAME}`,
    ])
  })

  test('a block with the right workflow but no environment is rebind', () => {
    // An empty environment is a mismatch, never a wildcard: the staging job
    // runs inside the npm-publish environment and npm matches the claim.
    const reading = readTrustedPublisherState(
      payloadWithConnection({ environment: '' }),
    )
    expect(decideStagedConfigurationState(reading)).toBe('rebind')
    expect(bindingMatchesTarget(reading.binding)).toBe(false)
  })

  test('a block bound right but missing the staged action is configure', () => {
    const reading = readTrustedPublisherState(
      payloadWithConnection({ permissions: ['createPackageVersion'] }),
    )
    expect(decideStagedConfigurationState(reading)).toBe('configure')
  })

  test('a correctly bound package still holding the direct grant is narrow, never skip', () => {
    // The owner's ruling: once the 0.0.0 placeholder exists, "npm stage
    // publish" is the ONLY permission a package may carry. Both grants
    // together means a release can still reach consumers with no approval
    // step, so this is work to do, not a package to skip past.
    const reading = readTrustedPublisherState(
      payloadWithConnection({
        permissions: ['createPackageVersion', 'createStagedPackage'],
      }),
    )
    expect(bindingMatchesTarget(reading.binding)).toBe(true)
    expect(permitsDirectPublish(reading.actions!)).toBe(true)
    expect(decideStagedConfigurationState(reading)).toBe('narrow')
  })

  test('a stage-only package is skipped, so a re-run is a no-op', () => {
    const reading = readTrustedPublisherState(
      payloadWithConnection({ permissions: ['createStagedPackage'] }),
    )
    expect(bindingMatchesTarget(reading.binding)).toBe(true)
    expect(permitsDirectPublish(reading.actions!)).toBe(false)
    expect(decideStagedConfigurationState(reading)).toBe('skip')
  })
})

describe('classifyStagedFetch', () => {
  test('a Cloudflare interstitial served as 200 HTML is a challenge, not JSON', () => {
    expect(
      classifyStagedFetch({
        body: '<html><head><title>Just a moment…</title></head></html>',
        status: 200,
      }),
    ).toBe('challenge')
  })

  test('a signed-out response is auth, not a challenge', () => {
    expect(classifyStagedFetch({ body: '{}', status: 403 })).toBe('auth')
  })

  test('a JSON body is ok', () => {
    expect(classifyStagedFetch({ body: '{"a":1}', status: 200 })).toBe('ok')
  })
})

describe('operator-facing messages', () => {
  test('a dry-run plan entry names the state, the unknown current binding, and the target', () => {
    const [target] = planStagedConfiguration([
      reportOf('@socketregistry/own-keys', 'not-staged', '0.0.0'),
    ])
    const block = formatStagedPlanLine({
      state: DRY_RUN_PLAN_STATE,
      target: target!,
    })
    expect(DRY_RUN_PLAN_STATE).toBe('create')
    expect(block).toContain('@socketregistry/own-keys (npm latest 0.0.0)')
    expect(block).toContain('state:   create')
    expect(block).toContain('current: no trusted publisher')
    expect(block).toContain(
      `target:  SocketDev/socket-registry, workflow ${TARGET_WORKFLOW_FILENAME}, environment ${TARGET_ENVIRONMENT_NAME}`,
    )
    expect(block).toContain(
      'page:    https://www.npmjs.com/package/@socketregistry/own-keys/access',
    )
  })

  test('a rebind plan entry names the binding npm reports today', () => {
    const [target] = planStagedConfiguration([
      reportOf('@socketregistry/abab', 'not-staged', '1.0.9'),
    ])
    const reading = readTrustedPublisherState(
      payloadWithConnection({ workflow: 'npm-publish.yml' }),
    )
    const block = formatStagedPlanLine({
      binding: reading.binding,
      state: decideStagedConfigurationState(reading),
      target: target!,
    })
    expect(block).toContain('state:   rebind')
    expect(block).toContain(
      'current: SocketDev/socket-registry, workflow npm-publish.yml',
    )
  })

  test('a narrow entry prints the current grants beside the wanted ones', () => {
    // A package whose ONLY defect is the extra direct grant has the same
    // binding, workflow, and environment as a correct one. The two grant lines
    // side by side are the only thing that shows the difference at a glance.
    const [target] = planStagedConfiguration([
      reportOf('@socketregistry/abab', 'not-staged', '1.0.9'),
    ])
    const reading = readTrustedPublisherState(
      payloadWithConnection({
        permissions: ['createPackageVersion', 'createStagedPackage'],
      }),
    )
    const block = formatStagedPlanLine({
      actions: reading.actions,
      binding: reading.binding,
      state: decideStagedConfigurationState(reading),
      target: target!,
    })
    expect(block).toContain('state:   narrow')
    expect(block).toContain('grants:  npm publish, npm stage publish')
    expect(block).toContain('wanted:  npm stage publish')
  })

  test('a dry-run entry says the grants are unknown rather than none', () => {
    // No page was read, so "(none)" would be a claim the run has no basis for.
    const [target] = planStagedConfiguration([
      reportOf('@socketregistry/own-keys', 'not-staged', '0.0.0'),
    ])
    expect(
      formatStagedPlanLine({ state: DRY_RUN_PLAN_STATE, target: target! }),
    ).toContain('grants:  (unknown)')
  })

  test('the write-failure block follows What / Where / Saw / Wanted / Fix', () => {
    const [target] = planStagedConfiguration([
      reportOf('@socketregistry/own-keys', 'not-staged', '0.0.0'),
    ])
    const lines = formatBindingWriteFailure({
      mismatches: [
        'workflowName: saved npm-publish.yml, wanted npm-publish-packages.yml',
      ],
      state: 'create',
      target: target!,
    }).split('\n')
    expect(lines[0]).toMatch(/^What: /)
    expect(lines[1]).toMatch(/^Where: /)
    expect(lines[2]).toMatch(/^Saw: /)
    expect(lines[3]).toMatch(/^Wanted: /)
    expect(lines[4]).toMatch(/^Fix: /)
    expect(lines[2]).toContain('after the create save')
    expect(lines[4]).toContain('PARTIALLY saved')
  })

  test('the unreadable-settings block follows What / Where / Saw / Wanted / Fix', () => {
    const lines = formatUnreadableSettings(
      {
        latestVersion: '1.0.8',
        name: '@socketregistry/date',
        settingsUrl:
          'https://www.npmjs.com/package/@socketregistry/date/access',
      },
      'npm answered HTTP 500.',
    ).split('\n')
    expect(lines[0]).toMatch(/^What: /)
    expect(lines[1]).toMatch(/^Where: /)
    expect(lines[2]).toMatch(/^Saw: /)
    expect(lines[3]).toMatch(/^Wanted: /)
    expect(lines[4]).toMatch(/^Fix: /)
  })
})

describe('re-derived payload key paths', () => {
  // The connection npm serves today, under the key it serves it with.
  const connectionOf = (config: Record<string, unknown>) => ({
    config,
    permissions: ['createStagedPackage'],
  })
  const TODAY_CONFIG = {
    environment_name: 'npm-publish',
    repository_name: 'socket-registry',
    repository_owner: 'SocketDev',
    workflow: 'npm-publish-packages.yml',
  }

  test('the observed key path still reads a correct binding as skip', () => {
    const reading = readTrustedPublisherState({
      oidcConnections: [connectionOf(TODAY_CONFIG)],
    })
    expect(reading.blockState).toBe('present')
    expect(reading.binding?.workflowFilename).toBe(TARGET_WORKFLOW_FILENAME)
    expect(decideStagedConfigurationState(reading)).toBe('skip')
  })

  // A renamed outer key must not turn a configured package into a planned
  // create — that would write a second publisher over a live row.
  test.each([
    'trustedPublishers',
    'trusted_publisher_connections',
    'oidcPublishers',
  ])('a connections list under %s reads the same binding', key => {
    const reading = readTrustedPublisherState({
      [key]: [connectionOf(TODAY_CONFIG)],
    })
    expect(reading.blockState).toBe('present')
    expect(decideStagedConfigurationState(reading)).toBe('skip')
  })

  // A renamed INNER key must degrade to the other spelling, not to an
  // all-(unset) binding that reads as a total mismatch and drives a rebind.
  test('camelCase config keys read the same binding as the snake_case ones', () => {
    const reading = readTrustedPublisherState({
      oidcConnections: [
        connectionOf({
          environmentName: 'npm-publish',
          repositoryName: 'socket-registry',
          repositoryOwner: 'SocketDev',
          workflowFilename: 'npm-publish-packages.yml',
        }),
      ],
    })
    expect(reading.binding).toEqual({
      environmentName: TARGET_ENVIRONMENT_NAME,
      repositoryName: 'socket-registry',
      repositoryOwner: 'SocketDev',
      workflowFilename: TARGET_WORKFLOW_FILENAME,
    })
    expect(decideStagedConfigurationState(reading)).toBe('skip')
  })

  test('the observed spelling wins when a payload carries both', () => {
    const reading = readTrustedPublisherState({
      oidcConnections: [
        connectionOf({
          ...TODAY_CONFIG,
          workflowFilename: 'npm-publish.yml',
        }),
      ],
    })
    expect(reading.binding?.workflowFilename).toBe(TARGET_WORKFLOW_FILENAME)
  })

  test('a connections list with no live row is still create, not unreadable', () => {
    const reading = readTrustedPublisherState({ oidcConnections: [] })
    expect(reading.blockState).toBe('absent')
    expect(decideStagedConfigurationState(reading)).toBe('create')
  })
})

describe('two-factor step-up reaching the reader', () => {
  // The payload npm answered the access URL with on 2026-08-05. Keys real,
  // values invented.
  const ESCALATION_PAYLOAD: unknown = JSON.parse(`{
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
  }`)

  test('it is recognized as the step-up it is', () => {
    expect(isTwoFactorEscalationPayload(ESCALATION_PAYLOAD)).toBe(true)
    expect(isTwoFactorEscalationPayload({ oidcConnections: [] })).toBe(false)
    expect(isTwoFactorEscalationPayload(JSON.parse('null'))).toBe(false)
    expect(isTwoFactorEscalationPayload(undefined)).toBe(false)
    expect(isTwoFactorEscalationPayload([])).toBe(false)
  })

  // Recognizing it must not soften the verdict: a step-up says nothing about
  // the package, so a write must never be planned off one.
  test('it stays unreadable and never reads as create', () => {
    const reading = readTrustedPublisherState(ESCALATION_PAYLOAD)
    expect(reading.blockState).toBe('unreadable')
    expect(decideStagedConfigurationState(reading)).toBe('unreadable')
  })

  test('the Saw line names the code, not a renamed key', () => {
    const cause = describeUnreadableCause(ESCALATION_PAYLOAD)
    expect(cause).toContain('two-factor step-up')
    expect(cause).toContain('authenticator code')
    expect(cause).not.toContain('neither a trusted-publisher')
  })

  test('a genuinely unrecognized payload still points at re-derivation', () => {
    const cause = describeUnreadableCause({ somethingElse: true })
    expect(cause).toContain('neither a trusted-publisher connections list')
  })
})
