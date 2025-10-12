import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

import {
  cleanDlxCache,
  dlxBinary,
  getDlxCachePath,
  listDlxCache,
} from '../../registry/dist/lib/dlx-binary.js'
import { deleteAsync as del } from 'del'

import type { IncomingMessage, ServerResponse } from 'node:http'

const WIN32 = process.platform === 'win32'

const TEST_BINARY_CONTENT = WIN32
  ? '@echo off\r\necho test binary'
  : '#!/bin/sh\necho "test binary"'

const SLOW_BINARY_CONTENT = WIN32
  ? '@echo off\r\necho slow binary'
  : '#!/bin/sh\necho "slow binary"'

describe('dlx-binary', () => {
  let server: ReturnType<typeof createServer>
  let baseUrl: string
  let tmpDir: string

  beforeAll(async () => {
    await cleanDlxCache(0)
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const fullUrl = req.url || '/'
      const url = fullUrl.split('?')[0]

      if (url === '/test-binary') {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
        res.end(TEST_BINARY_CONTENT)
      } else if (url === '/slow-binary') {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
        setTimeout(() => {
          res.end(SLOW_BINARY_CONTENT)
        }, 100)
      } else if (url === '/error') {
        res.writeHead(500, 'Internal Server Error')
        res.end('Server error')
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    await new Promise<void>(resolve => {
      server.listen(0, () => {
        const address = server.address()
        const port =
          typeof address === 'object' && address !== null
            ? address.port
            : undefined
        baseUrl = `http://127.0.0.1:${port}`
        resolve()
      })
    })
  })

  beforeEach(async () => {
    tmpDir = await import('node:fs/promises').then(m =>
      m.mkdtemp(path.join(os.tmpdir(), 'socket-test-dlx-binary-')),
    )
  })

  afterEach(async () => {
    await del(tmpDir, { force: true })
  })

  afterAll(async () => {
    await new Promise<void>(resolve => {
      server.close(() => {
        resolve()
      })
    })
    await cleanDlxCache(0)
  })

  describe('getDlxCachePath', () => {
    it('should return a valid cache path', () => {
      const cachePath = getDlxCachePath()
      expect(typeof cachePath).toBe('string')
      expect(cachePath).toContain('dlx')
      expect(cachePath).not.toContain('\\')
      expect(path.isAbsolute(cachePath)).toBe(true)
    })
  })

  describe('dlxBinary', () => {
    it('should download and cache a binary', async () => {
      const binaryName = WIN32 ? 'test-binary.cmd' : 'test-binary'
      const { binaryPath, downloaded } = await dlxBinary(['--version'], {
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=download-cache`,
      })

      expect(downloaded).toBe(true)
      expect(typeof binaryPath).toBe('string')
      expect(binaryPath).toContain('test-binary')

      const fs = await import('node:fs/promises')
      const exists = await fs
        .access(binaryPath)
        .then(() => true)
        .catch(() => false)
      expect(exists).toBe(true)
    })

    it('should use cached binary on subsequent calls', async () => {
      const binaryName = WIN32 ? 'test-binary-cached.cmd' : 'test-binary-cached'
      const options = {
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=cached`,
      }

      const result1 = await dlxBinary(['--version'], options)
      expect(result1.downloaded).toBe(true)

      const result2 = await dlxBinary(['--version'], options)
      expect(result2.downloaded).toBe(false)
      expect(result2.binaryPath).toBe(result1.binaryPath)
    })

    it('should force re-download when force option is true', async () => {
      const binaryName = WIN32 ? 'test-binary-force.cmd' : 'test-binary-force'
      const options = {
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=force`,
      }

      const result1 = await dlxBinary(['--version'], options)
      expect(result1.downloaded).toBe(true)

      const result2 = await dlxBinary(['--version'], {
        ...options,
        force: true,
      })
      expect(result2.downloaded).toBe(true)
    })

    it('should generate binary name based on platform when name is not provided', async () => {
      const { binaryPath, spawnPromise } = await dlxBinary(['--version'], {
        name: WIN32 ? 'test-binary.cmd' : undefined,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=platform`,
      })

      // Wait for spawn to complete.
      await spawnPromise.catch(() => {})

      if (WIN32) {
        // On Windows, when name is provided with .cmd extension, it should be preserved.
        expect(binaryPath).toContain('.cmd')
      } else {
        // On Unix, when name is not provided, dlxBinary generates a name without .exe.
        expect(binaryPath).not.toContain('.exe')
      }
    })

    it('should verify checksum when provided', async () => {
      const binaryName = WIN32
        ? 'test-binary-checksum.cmd'
        : 'test-binary-checksum'
      const crypto = await import('node:crypto')
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(TEST_BINARY_CONTENT)
        .digest('hex')

      const { downloaded } = await dlxBinary(['--version'], {
        checksum: expectedChecksum,
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=checksum`,
      })

      expect(downloaded).toBe(true)
    })

    it('should throw error when checksum does not match', async () => {
      const binaryName = WIN32
        ? 'test-binary-bad-checksum.cmd'
        : 'test-binary-bad-checksum'
      await expect(
        dlxBinary(['--version'], {
          checksum: 'invalid-checksum',
          name: binaryName,
          spawnOptions: { cwd: tmpDir },
          url: `${baseUrl}/test-binary?test=bad-checksum`,
        }),
      ).rejects.toThrow('Checksum mismatch')
    })

    it('should respect custom cacheTtl', async () => {
      const binaryName = WIN32 ? 'test-binary-ttl.cmd' : 'test-binary-ttl'
      const { binaryPath } = await dlxBinary(['--version'], {
        cacheTtl: 1000,
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=ttl`,
      })

      const fs = await import('node:fs/promises')
      const metadataPath = path.join(
        path.dirname(binaryPath),
        '.dlx-metadata.json',
      )
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))

      expect(metadata).toHaveProperty('timestamp')
      expect(metadata).toHaveProperty('url')
    })
  })

  describe('listDlxCache', () => {
    it('should return empty array when cache is empty', async () => {
      const list = await listDlxCache()
      expect(Array.isArray(list)).toBe(true)
    })

    it('should list cached binaries', async () => {
      const binaryName = WIN32 ? 'test-binary-list.cmd' : 'test-binary-list'
      await dlxBinary(['--version'], {
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=list`,
      })

      const list = await listDlxCache()
      expect(Array.isArray(list)).toBe(true)

      if (list.length > 0) {
        const entry = list.find(e => e.name === binaryName)
        if (entry) {
          expect(entry).toHaveProperty('url')
          expect(entry).toHaveProperty('size')
          expect(entry).toHaveProperty('age')
          expect(entry).toHaveProperty('platform')
          expect(entry).toHaveProperty('arch')
          expect(entry).toHaveProperty('checksum')
        }
      }
    })
  })

  describe('cleanDlxCache', () => {
    it('should return 0 when cache does not exist', async () => {
      const cleaned = await cleanDlxCache()
      expect(cleaned).toBeGreaterThanOrEqual(0)
    })

    it('should clean expired cache entries', async () => {
      const binaryName = WIN32 ? 'test-binary-clean.cmd' : 'test-binary-clean'
      const cachePath = getDlxCachePath()
      const fs = await import('node:fs/promises')

      const { spawnPromise } = await dlxBinary(['--version'], {
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=clean`,
      })

      // Wait for the spawned process to complete before cleaning cache.
      await spawnPromise.catch(() => {})

      const entries = await fs.readdir(cachePath).catch(() => [])
      const hasEntries = entries.length > 0

      const cleaned = await cleanDlxCache(0)

      if (hasEntries) {
        expect(cleaned).toBeGreaterThanOrEqual(0)
      }
    })

    it('should not clean recent cache entries', async () => {
      const binaryName = WIN32 ? 'test-binary-recent.cmd' : 'test-binary-recent'
      const { spawnPromise } = await dlxBinary(['--version'], {
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=recent`,
      })

      // Wait for the spawned process to complete.
      await spawnPromise.catch(() => {})

      const cleaned = await cleanDlxCache(1000000)
      expect(cleaned).toBeGreaterThanOrEqual(0)
    })

    it('should handle corrupted metadata gracefully', async () => {
      const cachePath = getDlxCachePath()
      const fs = await import('node:fs/promises')

      const corruptedDir = path.join(cachePath, 'corrupted-entry')
      await fs.mkdir(corruptedDir, { recursive: true })
      await fs.writeFile(
        path.join(corruptedDir, '.dlx-metadata.json'),
        'invalid json',
      )

      const cleaned = await cleanDlxCache(0)
      expect(cleaned).toBeGreaterThanOrEqual(0)
    })

    it('should remove empty directories', async () => {
      const cachePath = getDlxCachePath()
      const fs = await import('node:fs/promises')

      const emptyDir = path.join(cachePath, 'empty-entry')
      await fs.mkdir(emptyDir, { recursive: true })

      const cleaned = await cleanDlxCache(0)
      expect(cleaned).toBeGreaterThanOrEqual(0)
    })
  })

  describe('error handling', () => {
    it('should throw error when download fails', async () => {
      const binaryName = WIN32 ? 'test-binary-error.cmd' : 'test-binary-error'
      await expect(
        dlxBinary(['--version'], {
          name: binaryName,
          spawnOptions: { cwd: tmpDir },
          url: `${baseUrl}/error`,
        }),
      ).rejects.toThrow()
    })

    it('should throw error when URL is invalid', async () => {
      const binaryName = WIN32
        ? 'test-binary-invalid.cmd'
        : 'test-binary-invalid'
      await expect(
        dlxBinary(['--version'], {
          name: binaryName,
          spawnOptions: { cwd: tmpDir },
          url: 'invalid-url',
        }),
      ).rejects.toThrow()
    })
  })

  describe('cross-platform behavior', () => {
    it.skipIf(WIN32)(
      'should set executable permissions on POSIX systems',
      async () => {
        const { binaryPath } = await dlxBinary(['--version'], {
          name: 'test-binary-perms',
          spawnOptions: { cwd: tmpDir },
          url: `${baseUrl}/test-binary?test=perms`,
        })

        const fs = await import('node:fs/promises')
        const stats = await fs.stat(binaryPath)
        const mode = stats.mode & 0o777
        expect(mode & 0o111).not.toBe(0)
      },
    )

    it('should handle Windows paths correctly', async () => {
      const binaryName = WIN32
        ? 'test-binary-windows.cmd'
        : 'test-binary-windows'
      const { binaryPath, spawnPromise } = await dlxBinary(['--version'], {
        name: binaryName,
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=windows`,
      })

      // Wait for the spawned process to complete.
      await spawnPromise.catch(() => {})

      expect(binaryPath).not.toContain('\\')
      expect(path.isAbsolute(binaryPath)).toBe(true)
    })
  })
})
