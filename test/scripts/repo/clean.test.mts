import { selectCleanTasks } from '../../../scripts/repo/clean.mts'
import { expect, it } from 'vitest'
import { readCliHelp } from './cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('clean.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm clean')
})

it('cleans generated output by default while preserving dependencies', () => {
  expect(selectCleanTasks({}).map(task => task.name)).toEqual([
    'cache',
    'coverage',
    'dist',
  ])
  expect(selectCleanTasks({ modules: true }).map(task => task.name)).toEqual([
    'node_modules',
  ])
})

it('lets a full build cleanup subsume a declarations-only request', () => {
  expect(selectCleanTasks({ types: true })).toEqual([
    { name: 'dist/types', patterns: ['dist/types'] },
  ])
  expect(selectCleanTasks({ dist: true, types: true })).toEqual([
    { name: 'dist', patterns: ['dist', '*.tsbuildinfo', '.tsbuildinfo'] },
  ])
  expect(
    selectCleanTasks({ all: true, modules: true }).map(task => task.name),
  ).toEqual(['cache', 'coverage', 'dist', 'node_modules'])
})
