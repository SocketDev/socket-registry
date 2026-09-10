import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('PRE_COMMIT', '')
  vi.stubEnv('FORCE_TEST', '')
  vi.stubEnv('CI', '')
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

test('ordinary runs execute override tests', async () => {
  const { isPackageTestingSkipped } =
    await import('../../../../scripts/repo/util/tests.mts')
  expect(isPackageTestingSkipped()).toBe(false)
})

test('pre-commit can skip override tests unless explicitly forced', async () => {
  vi.stubEnv('PRE_COMMIT', 'true')
  const { isPackageTestingSkipped } =
    await import('../../../../scripts/repo/util/tests.mts')
  expect(isPackageTestingSkipped()).toBe(true)
  vi.stubEnv('FORCE_TEST', '1')
  expect(isPackageTestingSkipped()).toBe(false)
})

test('CI executes override tests', async () => {
  vi.stubEnv('CI', 'true')
  const { isPackageTestingSkipped } =
    await import('../../../../scripts/repo/util/tests.mts')
  expect(isPackageTestingSkipped()).toBe(false)
})
