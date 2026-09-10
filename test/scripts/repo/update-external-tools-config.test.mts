import { expect, it } from 'vitest'
import { getToolFlavors } from '../../../scripts/repo/update-external-tools-config.mts'

it('keeps declared empty platform maps eligible and orders free before enterprise', () => {
  expect(
    getToolFlavors({
      enterprise: {
        repository: 'github:example-org/enterprise',
        binaryName: 'example-tool',
        platforms: {},
      },
      free: {
        repository: 'github:example-org/free',
        binaryName: 'example-tool',
        platforms: {},
      },
    }),
  ).toEqual([{ key: 'free' }, { key: 'enterprise' }])
})

it('leaves single-flavor platform configuration on its existing update path', () => {
  expect(
    getToolFlavors({ repository: 'github:example-org/tool', platforms: {} }),
  ).toEqual([])
  expect(getToolFlavors({})).toEqual([])
})
