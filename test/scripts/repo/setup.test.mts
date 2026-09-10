import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { acquireLock } from '../../../scripts/repo/setup.mts'
import { afterEach, expect, it } from 'vitest'
import { readCliHelp } from './cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('setup.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm setup')
})

const scratchRoots: string[] = []

afterEach(async () => {
  for (const root of scratchRoots.splice(0)) {
    await safeDelete(root)
  }
})

function lockFixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'registry-setup-lock-'))
  scratchRoots.push(root)
  return path.join(root, 'tool.lock')
}

it('releases a lock owned by this setup process', async () => {
  const lockPath = lockFixture()
  const release = await acquireLock(lockPath)
  expect(readFileSync(lockPath, 'utf8')).toBe(String(process.pid))
  await release()
  expect(existsSync(lockPath)).toBe(false)
})

it('honors an exhausted acquisition deadline without creating a lock', async () => {
  const lockPath = lockFixture()
  await expect(acquireLock(lockPath, { timeoutMs: 0 })).rejects.toThrow(Error)
  expect(existsSync(lockPath)).toBe(false)
})
