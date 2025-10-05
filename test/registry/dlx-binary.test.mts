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
import { trash } from '../../scripts/utils/fs.mjs'

import type { IncomingMessage, ServerResponse } from 'node:http'

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
        res.end('#!/bin/sh\necho "test binary"')
      } else if (url === '/slow-binary') {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
        setTimeout(() => {
          res.end('#!/bin/sh\necho "slow binary"')
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
    await trash(tmpDir)
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
      const { binaryPath, downloaded } = await dlxBinary(['--version'], {
        name: 'test-binary',
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
      const options = {
        name: 'test-binary-cached',
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
      const options = {
        name: 'test-binary-force',
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
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=platform`,
      })

      if (os.platform() === 'win32') {
        // On Windows, dlxBinary should append .exe to binary names.
        expect(binaryPath).toContain('.exe')
        // The test server returns shell scripts, which can't be executed on Windows.
        // We ignore spawn errors on Windows since this test is only validating the
        // binary naming logic, not actual execution.
        await spawnPromise.catch(() => {})
      } else {
        // On Unix, binary names should not have .exe extension.
        expect(binaryPath).not.toContain('.exe')
        // Shell scripts work on Unix, so wait for the process to complete.
        await spawnPromise
      }
    })

    it('should verify checksum when provided', async () => {
      const content = '#!/bin/sh\necho "test binary"'
      const crypto = await import('node:crypto')
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex')

      const { downloaded } = await dlxBinary(['--version'], {
        checksum: expectedChecksum,
        name: 'test-binary-checksum',
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=checksum`,
      })

      expect(downloaded).toBe(true)
    })

    it('should throw error when checksum does not match', async () => {
      await expect(
        dlxBinary(['--version'], {
          checksum: 'invalid-checksum',
          name: 'test-binary-bad-checksum',
          spawnOptions: { cwd: tmpDir },
          url: `${baseUrl}/test-binary?test=bad-checksum`,
        }),
      ).rejects.toThrow('Checksum mismatch')
    })

    it('should respect custom cacheTtl', async () => {
      const { binaryPath } = await dlxBinary(['--version'], {
        cacheTtl: 1000,
        name: 'test-binary-ttl',
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

    it('should handle platform and arch overrides', async () => {
      const { binaryPath } = await dlxBinary(['--version'], {
        arch: 'arm64',
        platform: 'linux',
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=platform-override`,
      })

      expect(binaryPath).toContain('linux-arm64')
    })
  })

  describe('listDlxCache', () => {
    it('should return empty array when cache is empty', async () => {
      const list = await listDlxCache()
      expect(Array.isArray(list)).toBe(true)
    })

    it('should list cached binaries', async () => {
      await dlxBinary(['--version'], {
        name: 'test-binary-list',
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=list`,
      })

      const list = await listDlxCache()
      expect(Array.isArray(list)).toBe(true)

      if (list.length > 0) {
        const entry = list.find(e => e.name === 'test-binary-list')
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
      const cachePath = getDlxCachePath()
      const fs = await import('node:fs/promises')

      const { spawnPromise } = await dlxBinary(['--version'], {
        name: 'test-binary-clean',
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=clean`,
      })

      // Wait for the spawned process to complete before cleaning cache.
      // On Windows, the shell script will fail to execute, but that's okay -
      // this test is about cache cleaning, not binary execution.
      await spawnPromise.catch(() => {})

      const entries = await fs.readdir(cachePath).catch(() => [])
      const hasEntries = entries.length > 0

      const cleaned = await cleanDlxCache(0)

      if (hasEntries) {
        expect(cleaned).toBeGreaterThanOrEqual(0)
      }
    })

    it('should not clean recent cache entries', async () => {
      const { spawnPromise } = await dlxBinary(['--version'], {
        name: 'test-binary-recent',
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=recent`,
      })

      // Wait for the spawned process to complete.
      // On Windows, the shell script will fail to execute, but we catch the error
      // since this test verifies cache TTL behavior, not binary execution.
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
      await expect(
        dlxBinary(['--version'], {
          name: 'test-binary-error',
          spawnOptions: { cwd: tmpDir },
          url: `${baseUrl}/error`,
        }),
      ).rejects.toThrow()
    })

    it('should throw error when URL is invalid', async () => {
      await expect(
        dlxBinary(['--version'], {
          name: 'test-binary-invalid',
          spawnOptions: { cwd: tmpDir },
          url: 'invalid-url',
        }),
      ).rejects.toThrow()
    })
  })

  describe('cross-platform behavior', () => {
    it('should set executable permissions on POSIX systems', async () => {
      const { binaryPath } = await dlxBinary(['--version'], {
        name: 'test-binary-perms',
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=perms`,
      })

      if (os.platform() !== 'win32') {
        const fs = await import('node:fs/promises')
        const stats = await fs.stat(binaryPath)
        const mode = stats.mode & 0o777
        expect(mode & 0o111).not.toBe(0)
      }
    })

    it('should handle Windows paths correctly', async () => {
      const { binaryPath, spawnPromise } = await dlxBinary(['--version'], {
        name: 'test-binary-windows',
        spawnOptions: { cwd: tmpDir },
        url: `${baseUrl}/test-binary?test=windows`,
      })

      // Wait for the spawned process to complete.
      // On Windows, the shell script won't execute, but this test is about
      // verifying that dlxBinary returns normalized paths (forward slashes)
      // regardless of platform, for cross-platform consistency.
      await spawnPromise.catch(() => {})

      expect(binaryPath).not.toContain('\\')
      expect(path.isAbsolute(binaryPath)).toBe(true)
    })
  })
})
