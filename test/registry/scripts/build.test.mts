import process from 'node:process'
import { expect, it, vi } from 'vitest'
import { buildSource, buildTypes } from '../../../registry/scripts/build.mts'

const { runSequence } = vi.hoisted(() => ({
  __proto__: null,
  runSequence: vi.fn(),
}))
vi.mock(import('../../../scripts/fleet/util/run-command.mts'), () => ({
  __proto__: null,
  runSequence,
}))

it('keeps direct source and declaration build commands on the externally managed pnpm', async () => {
  runSequence.mockResolvedValue(7)
  expect((await buildSource({ quiet: true })).exitCode).toBe(7)
  expect(await buildTypes({ quiet: true })).toBe(7)
  expect(runSequence).toHaveBeenCalledTimes(2)
  const commands = runSequence.mock.calls.flatMap(call => call[0])
  expect(commands.map(command => command.args[1])).toEqual([
    'del-cli',
    'del-cli',
    'tsgo',
  ])
  for (let i = 0, { length } = commands; i < length; i += 1) {
    const command = commands[i]!
    expect(command.command).toBe('pnpm')
    expect(command.options.env).toEqual({
      ...process.env,
      pnpm_config_pm_on_fail: 'ignore',
    })
  }
})
