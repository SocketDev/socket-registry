import { afterEach, expect, it, vi } from 'vitest'
import {
  findTsReferenceChoices,
  selectOverrideTemplate,
} from '../../../../scripts/repo/npm/override/template.mts'
import { TEMPLATE_CJS_ESM } from '../../../../scripts/repo/constants/templates.mts'

const { confirm, select, search } = vi.hoisted(() => ({
  __proto__: null,
  confirm: vi.fn(),
  select: vi.fn(),
  search: vi.fn(),
}))
vi.mock(import('@socketsecurity/lib-stable/stdio/prompts'), async original => ({
  __proto__: null,
  ...(await original()),
  confirm,
  select,
  search,
}))
afterEach(() => {
  vi.clearAllMocks()
})

it('chooses interop for an ESM package without a template prompt', async () => {
  confirm.mockResolvedValue(false)
  expect(
    await selectOverrideTemplate('example-module', 'module', ['index.js']),
  ).toEqual({
    nodeRange: undefined,
    templateChoice: TEMPLATE_CJS_ESM,
    tsRefs: [],
  })
  expect(select).not.toHaveBeenCalled()
  expect(search).not.toHaveBeenCalled()
})

it('stops after a canceled template or reference prompt', async () => {
  select.mockResolvedValue(undefined)
  expect(
    await selectOverrideTemplate('example-module', undefined, []),
  ).toBeUndefined()
  expect(confirm).not.toHaveBeenCalled()
  confirm.mockResolvedValue(undefined)
  expect(
    await selectOverrideTemplate('example-module', 'module', []),
  ).toBeUndefined()
  expect(search).not.toHaveBeenCalled()
})

it('retains a custom reference alongside search suggestions', async () => {
  expect(await findTsReferenceChoices(undefined)).toEqual([])
  expect(await findTsReferenceChoices('   ')).toEqual(['   '])
  const choices = await findTsReferenceChoices('example-custom-reference')
  expect(choices).toContainEqual({
    name: 'example-custom-reference',
    value: 'example-custom-reference',
  })
})
