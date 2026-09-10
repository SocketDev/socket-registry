import process from 'node:process'
import { afterEach, expect, it, vi } from 'vitest'
import {
  composeBumpSection,
  reconcileAppliedBump,
  resolveBumpVersion,
  writeBumpChanges,
} from '../../../scripts/repo/bump-release.mts'

const { write, capture } = vi.hoisted(() => ({
  __proto__: null,
  write: vi.fn(),
  capture: vi.fn(),
}))
vi.mock(import('node:fs'), async original => ({
  __proto__: null,
  ...(await original()),
  writeFileSync: write,
}))
vi.mock(
  import('../../../scripts/fleet/registry-infra/shared.mts'),
  async original => ({
    __proto__: null,
    ...(await original()),
    runCapture: capture,
  }),
)
const exitCode = process.exitCode
afterEach(() => {
  process.exitCode = exitCode
  write.mockReset()
  capture.mockReset()
})

it('requires an explicit signal for a major version hint', () => {
  const derivation = {
    anchor: { kind: 'tag' as const, ref: 'v1.0.0', version: '1.0.0' },
    base: '1.0.0',
    commits: [],
    fromTag: 'v1.0.0',
    publishedVersion: '1.0.0',
  }
  expect(
    resolveBumpVersion(undefined, '2.0.0-next.1', '', derivation),
  ).toBeUndefined()
  expect(process.exitCode).toBe(1)
  expect(resolveBumpVersion('major', '2.0.0-next.1', '', derivation)).toEqual({
    level: 'major',
    nextVersion: '2.0.0',
  })
})

it('previews an already-applied root mirror repair without writing or committing', async () => {
  expect(
    await reconcileAppliedBump({
      existingChangelog: '## 1.1.0\n\n- Change\n',
      nextVersion: '1.1.0',
      pkg: { version: '1.1.0' },
      rootPkg: { version: '1.0.0' },
      rootRaw: '{"version":"1.0.0"}',
      dryRun: true,
      writeOnly: false,
    }),
  ).toBe(true)
  expect(write).not.toHaveBeenCalled()
  expect(capture).not.toHaveBeenCalled()
})

it('requires user-visible release notes and permits a supplied entry', () => {
  const context = {
    nextVersion: '1.1.0',
    date: '2026-01-01',
    repositoryUrl: undefined,
    existingChangelog: '',
    commits: [],
    emptyChangelogEntry: undefined,
  }
  expect(composeBumpSection(context)).toBeUndefined()
  expect(
    composeBumpSection({
      ...context,
      emptyChangelogEntry: 'Fix example behavior',
    })?.section,
  ).toContain('Fix example behavior')
})

it('writes both manifests and changelog without Git in write-only mode', async () => {
  await writeBumpChanges({
    nextVersion: '1.1.0',
    pkgRaw: '{"version":"1.0.0"}',
    rootRaw: '{"version":"1.0.0"}',
    changelogPath: '/fixture/CHANGELOG.md',
    baseChangelog: '',
    section: '## 1.1.0\n\n- Change\n',
    writeOnly: true,
  })
  expect(write).toHaveBeenCalledTimes(3)
  expect(write.mock.calls[0]?.[1]).toContain('1.1.0')
  expect(write.mock.calls[1]?.[0]).toBe('/fixture/CHANGELOG.md')
  expect(write.mock.calls[2]?.[1]).toContain('1.1.0')
  expect(capture).not.toHaveBeenCalled()
})
