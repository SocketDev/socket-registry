import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { expect, it } from 'vitest'
import { collectActionReferenceFiles } from '../../../../scripts/repo/ci/inline-action-versions-as-shas.mts'

it('discovers nested workflows before existing local action manifests', async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), 'registry-action-references-'),
  )
  try {
    const workflow = path.join(root, '.github/workflows/nested/verify.yml')
    const action = path.join(root, '.github/actions/example-action/action.yml')
    await mkdir(path.dirname(workflow), { recursive: true })
    await mkdir(path.dirname(action), { recursive: true })
    await mkdir(path.join(root, '.github/actions/missing-manifest'))
    await writeFile(workflow, '')
    await writeFile(action, '')
    expect(await collectActionReferenceFiles(root)).toEqual([workflow, action])
  } finally {
    await safeDelete(root)
  }
})
