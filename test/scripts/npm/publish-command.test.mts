import { describe, expect, test } from 'vitest'

import {
  getPublishWorkflow,
  publishAuthProblem,
  stagePublishArgs,
} from '../../../scripts/npm/publish-command.mts'

const repository = 'SocketDev/socket-registry'
const env: NodeJS.ProcessEnv = {
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'test-token',
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.test/token',
  GITHUB_ACTIONS: 'true',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REPOSITORY: repository,
  GITHUB_RUN_ATTEMPT: '1',
  GITHUB_RUN_ID: '123',
  GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/publish-npm.yml@refs/heads/main`,
}

describe('npm stage upload authorization', () => {
  test('permits the two manual trusted-publishing workflows', () => {
    expect(getPublishWorkflow(env)).toBe('publish-npm.yml')
    expect(publishAuthProblem(env)).toBeUndefined()
    const familyEnv = {
      ...env,
      GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/publish-npm-packages.yml@refs/heads/main`,
    }
    expect(getPublishWorkflow(familyEnv)).toBe('publish-npm-packages.yml')
    expect(publishAuthProblem(familyEnv)).toBeUndefined()
  })

  test('rejects local execution and refuses a different workflow', () => {
    expect(publishAuthProblem({})).toMatch(/GitHub Actions/u)
    expect(
      publishAuthProblem({
        ...env,
        GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/ci-gates.yml@refs/heads/main`,
      }),
    ).toMatch(/GitHub Actions/u)
  })

  test('requires runner OIDC and rejects token fallback and retries', () => {
    expect(
      publishAuthProblem({
        ...env,
        ACTIONS_ID_TOKEN_REQUEST_URL: undefined,
      }),
    ).toMatch(/OIDC/u)
    expect(publishAuthProblem({ ...env, NPM_TOKEN: 'test' })).toMatch(
      /NPM_TOKEN/u,
    )
    expect(publishAuthProblem({ ...env, GITHUB_RUN_ATTEMPT: '2' })).toMatch(
      /original npm stage/u,
    )
  })
})

test('stages the already packed tarball with the selected dist-tag', () => {
  const args = stagePublishArgs('/tmp/registry.tgz', 'next', true)
  expect(args.slice(0, 3)).toEqual(['stage', 'publish', '/tmp/registry.tgz'])
  expect(args.slice(args.indexOf('--tag'), args.indexOf('--tag') + 2)).toEqual([
    '--tag',
    'next',
  ])
  expect(args).toContain('--ignore-scripts')
  expect(args).toContain('--provenance')
  expect(stagePublishArgs('/tmp/registry.tgz', 'next', false)).toContain(
    '--no-provenance',
  )
})
