import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { collectActionDependencies } from '../../../../scripts/repo/ci/generate-actions-allow-list.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('ci/generate-actions-allow-list.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm generate-actions-allow-list')
})

it('combines nested workflows and local action manifests with action references taking precedence', async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), 'registry-action-dependencies-'),
  )
  try {
    const workflows = path.join(root, 'workflows')
    const actions = path.join(root, 'actions')
    await mkdir(path.join(workflows, 'nested'), { recursive: true })
    await mkdir(path.join(actions, 'example-action'), { recursive: true })
    await mkdir(path.join(actions, 'missing-manifest'))
    await writeFile(
      path.join(workflows, 'nested', 'verify.yml'),
      'uses: example-org/shared-action@workflow-ref # pinned reference\nuses: ./local-action\nuses: example-org/other-action@other-ref\n',
    )
    await writeFile(
      path.join(actions, 'example-action', 'action.yml'),
      'uses: example-org/shared-action@action-ref\n',
    )
    await writeFile(
      path.join(actions, 'ignored.txt'),
      'uses: ignored/action@ref',
    )
    expect([...(await collectActionDependencies(workflows, actions))]).toEqual([
      ['example-org/shared-action', 'example-org/shared-action@action-ref'],
      ['example-org/other-action', 'example-org/other-action@other-ref'],
    ])
  } finally {
    await safeDelete(root)
  }
})
