import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('testing/analyze-ci-failures.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm analyze-ci-failures')
})

it('extracts failure details without inherited keys', async () => {
  const { analyzeLog, generateRecommendations, groupFailures } =
    await import('../../../../scripts/repo/testing/analyze-ci-failures.mts')
  const failures = analyzeLog(
    [
      'Testing package: example-module',
      'build/example.js not found',
      "Failed to load plugin 'example-plugin' declared in 'example-config'",
      "Cannot find module 'example-dependency'",
      "ENOENT 'example-file.json'",
      '.pnpm/example-dependency/file.js',
    ].join('\n'),
  )
  expect(failures.map(failure => failure.details)).toEqual([
    { artifact: 'example.js' },
    { plugin: 'example-plugin', config: 'example-config' },
    { module: 'example-dependency' },
    { path: 'example-file.json' },
    { pnpmPath: 'example-dependency' },
  ])
  for (const failure of failures) {
    expect(Object.getPrototypeOf(failure.details)).toBeNull()
  }
  const recommendations = generateRecommendations(groupFailures(failures))
  const packageRecommendation = recommendations.find(
    rec => rec.level === 'package',
  )
  expect(packageRecommendation?.level).toBe('package')
  if (packageRecommendation?.level === 'package') {
    expect(packageRecommendation.count).toBe(4)
    for (const issue of packageRecommendation.issues) {
      expect(Object.getPrototypeOf(issue)).toBeNull()
    }
  }
})
