import process from 'node:process'
import { expect, it, vi } from 'vitest'
import { runRegistryBuild } from '../../../scripts/repo/build.mts'
import { ROOT_PATH } from '../../../scripts/repo/constants/paths.mts'
import { readCliHelp } from './cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('build.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm build')
})

const { runCommand } = vi.hoisted(() => ({
  __proto__: null,
  runCommand: vi.fn(),
}))
vi.mock(import('../../../scripts/fleet/util/run-command.mts'), () => ({
  __proto__: null,
  runCommand,
}))

it('builds the selected workspace without refreshing the externally managed package manager', async () => {
  runCommand.mockResolvedValueOnce(7)
  expect(await runRegistryBuild(['--types', '--quiet'])).toBe(7)
  expect(runCommand).toHaveBeenCalledWith(
    'pnpm',
    [
      '--filter',
      '@socketsecurity/registry',
      'run',
      'build',
      '--',
      '--types',
      '--quiet',
    ],
    {
      cwd: ROOT_PATH,
      env: { ...process.env, pnpm_config_pm_on_fail: 'ignore' },
    },
  )
})
