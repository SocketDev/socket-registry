import { expect, test } from 'vitest'

import { parseStageListJson } from '../../../scripts/npm/stage-list.mts'

const stageId = '12a0f138-a66c-4888-8fd7-67bf30c771ed'
const name = '@socketregistry/own-keys'
const version = '1.0.1'

test('accepts npm array and older keyed stage lists', () => {
  const stages = [{ name, stageId, version }]
  expect(
    parseStageListJson(
      JSON.stringify([{ id: stageId, packageName: name, version }]),
    ),
  ).toEqual(stages)
  expect(
    parseStageListJson(JSON.stringify({ [`${name}@${version}`]: stages[0] })),
  ).toEqual(stages)
})

test('rejects malformed or incomplete npm stage lists', () => {
  expect(() => parseStageListJson('not JSON')).toThrow()
  expect(() => parseStageListJson('null')).toThrow()
  expect(() =>
    parseStageListJson(JSON.stringify([{ name, stageId }])),
  ).toThrow()
  expect(() =>
    parseStageListJson(JSON.stringify([{ name, stageId: '--otp', version }])),
  ).toThrow()
})
