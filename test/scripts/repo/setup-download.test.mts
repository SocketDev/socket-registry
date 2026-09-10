import crypto from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { afterEach, expect, it, vi } from 'vitest'
import { downloadAndVerify } from '../../../scripts/repo/setup.mts'

const { spawnMock } = vi.hoisted(() => ({
  __proto__: null,
  spawnMock: vi.fn(),
}))
vi.mock(
  import('@socketsecurity/lib-stable/process/spawn/child'),
  async importOriginal => ({
    __proto__: null,
    ...(await importOriginal()),
    spawn: spawnMock,
  }),
)

const scratchRoots: string[] = []
const archive = 'fixture archive'
const tool = 'example-tool'
const binaryName = process.platform === 'win32' ? `${tool}.exe` : tool
const integrity = `sha256-${crypto.createHash('sha256').update(archive).digest('base64')}`

afterEach(async () => {
  vi.unstubAllEnvs()
  spawnMock.mockReset()
  for (const root of scratchRoots.splice(0)) {
    await safeDelete(root)
  }
})

function setupCache(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'registry-setup-download-'))
  scratchRoots.push(root)
  vi.stubEnv('EXTERNAL_TOOLS_CACHE', root)
  spawnMock.mockImplementation(async (command: string, args: string[]) => {
    if (command === 'curl') {
      writeFileSync(args[4]!, archive)
    } else if (command === 'tar') {
      writeFileSync(path.join(args[3]!, binaryName), 'fixture executable')
    } else {
      throw new Error(`Unexpected fixture command: ${command}`)
    }
    return { __proto__: null, code: 0 }
  })
  return root
}

function toolConfig(expectedIntegrity: string) {
  const platform = process.platform === 'win32' ? 'win' : process.platform
  return {
    __proto__: null,
    repository: 'github:example-org/example-tool',
    version: '1.0.0',
    platforms: {
      [`${platform}-${process.arch}`]: {
        asset: 'example-tool.tar.gz',
        integrity: expectedIntegrity,
      },
    },
  }
}

it('rejects an unverified archive before extraction and releases its lock', async () => {
  const root = setupCache()
  await expect(
    downloadAndVerify(tool, toolConfig('sha256-AAAA')),
  ).rejects.toThrow(Error)
  expect(spawnMock).toHaveBeenCalledTimes(1)
  expect(existsSync(path.join(root, '.lock-example-tool-1.0.0'))).toBe(false)
})

it('installs verified bytes and reuses the verified cache without another download', async () => {
  const root = setupCache()
  const config = toolConfig(integrity)
  const binaryPath = await downloadAndVerify(tool, config)
  expect(binaryPath).toBeDefined()
  expect(readFileSync(binaryPath!, 'utf8')).toBe('fixture executable')
  expect(
    readFileSync(path.join(path.dirname(binaryPath!), '.integrity'), 'utf8'),
  ).toBe(integrity)
  expect(await downloadAndVerify(tool, config)).toBe(binaryPath)
  expect(spawnMock).toHaveBeenCalledTimes(2)
  expect(existsSync(path.join(root, '.lock-example-tool-1.0.0'))).toBe(false)
})
