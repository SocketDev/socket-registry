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

import { downloadWithLock } from '../../registry/dist/lib/download-lock.js'
import { trash } from '../../scripts/utils/fs.mjs'

import type { IncomingMessage, ServerResponse } from 'node:http'

describe('downloadWithLock', () => {
  let server: ReturnType<typeof createServer>
  let baseUrl: string
  let tmpDir: string

  beforeAll(async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url || '/'

      if (url === '/test-file') {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
        res.end('test file content')
      } else if (url === '/slow-download') {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
        setTimeout(() => {
          res.end('slow download content')
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
      m.mkdtemp(path.join(os.tmpdir(), 'socket-test-download-lock-')),
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
  })

  describe('basic download functionality', () => {
    it('should download a file successfully', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const result = await downloadWithLock(`${baseUrl}/test-file`, destPath)

      expect(result.path).toBe(destPath)
      expect(result.size).toBeGreaterThan(0)

      const fs = await import('node:fs/promises')
      const content = await fs.readFile(destPath, 'utf8')
      expect(content).toBe('test file content')
    })

    it('should return existing file if already downloaded', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const fs = await import('node:fs/promises')

      await fs.writeFile(destPath, 'existing content')

      const result = await downloadWithLock(`${baseUrl}/test-file`, destPath)

      expect(result.path).toBe(destPath)
      expect(result.size).toBeGreaterThan(0)

      const content = await fs.readFile(destPath, 'utf8')
      expect(content).toBe('existing content')
    })

    it('should create destination directory if it does not exist', async () => {
      const nestedDir = path.join(tmpDir, 'nested', 'dir')
      const destPath = path.join(nestedDir, 'test-file.txt')

      const result = await downloadWithLock(`${baseUrl}/test-file`, destPath)

      expect(result.path).toBe(destPath)
      expect(result.size).toBeGreaterThan(0)
    })
  })

  describe('locking behavior', () => {
    it('should create and remove lock file during download', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const locksDir = path.join(tmpDir, '.locks')

      const downloadPromise = downloadWithLock(
        `${baseUrl}/slow-download`,
        destPath,
        { locksDir, pollInterval: 50 },
      )

      await new Promise(resolve => setTimeout(resolve, 50))

      const fs = await import('node:fs/promises')
      const lockFiles = await fs.readdir(locksDir).catch(() => [])
      expect(lockFiles.length).toBeGreaterThan(0)

      await downloadPromise

      const lockFilesAfter = await fs.readdir(locksDir).catch(() => [])
      expect(lockFilesAfter.length).toBe(0)
    })

    it('should wait for concurrent downloads to complete', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const locksDir = path.join(tmpDir, '.locks')

      const download1 = downloadWithLock(`${baseUrl}/slow-download`, destPath, {
        locksDir,
        pollInterval: 50,
      })

      await new Promise(resolve => setTimeout(resolve, 20))

      const download2 = downloadWithLock(`${baseUrl}/slow-download`, destPath, {
        locksDir,
        pollInterval: 50,
      })

      const [result1, result2] = await Promise.all([download1, download2])

      expect(result1.path).toBe(destPath)
      expect(result2.path).toBe(destPath)
    })

    it('should timeout if lock cannot be acquired', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const locksDir = path.join(tmpDir, '.locks')
      const fs = await import('node:fs/promises')

      await fs.mkdir(locksDir, { recursive: true })
      const lockPath = path.join(
        locksDir,
        `${destPath.replace(/[^\w.-]/g, '_')}.lock`,
      )
      await fs.writeFile(
        lockPath,
        JSON.stringify({
          pid: process.pid,
          startTime: Date.now(),
          url: `${baseUrl}/test-file`,
        }),
      )

      await expect(
        downloadWithLock(`${baseUrl}/test-file`, destPath, {
          lockTimeout: 100,
          locksDir,
          pollInterval: 10,
          staleTimeout: 300000,
        }),
      ).rejects.toThrow('Lock acquisition timed out')
    })

    it('should remove stale locks', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const locksDir = path.join(tmpDir, '.locks')
      const fs = await import('node:fs/promises')

      await fs.mkdir(locksDir, { recursive: true })
      const lockPath = path.join(
        locksDir,
        `${destPath.replace(/[^\w.-]/g, '_')}.lock`,
      )
      await fs.writeFile(
        lockPath,
        JSON.stringify({
          pid: 999999,
          startTime: Date.now() - 400000,
          url: `${baseUrl}/test-file`,
        }),
      )

      const result = await downloadWithLock(`${baseUrl}/test-file`, destPath, {
        locksDir,
        pollInterval: 50,
        staleTimeout: 300000,
      })

      expect(result.path).toBe(destPath)
      expect(result.size).toBeGreaterThan(0)
    })
  })

  describe('options', () => {
    it('should respect custom lockTimeout', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const locksDir = path.join(tmpDir, '.locks')
      const fs = await import('node:fs/promises')

      await fs.mkdir(locksDir, { recursive: true })
      const lockPath = path.join(
        locksDir,
        `${destPath.replace(/[^\w.-]/g, '_')}.lock`,
      )
      await fs.writeFile(
        lockPath,
        JSON.stringify({
          pid: process.pid,
          startTime: Date.now(),
          url: `${baseUrl}/test-file`,
        }),
      )

      const startTime = Date.now()
      await expect(
        downloadWithLock(`${baseUrl}/test-file`, destPath, {
          lockTimeout: 200,
          locksDir,
          pollInterval: 50,
          staleTimeout: 300000,
        }),
      ).rejects.toThrow()
      const duration = Date.now() - startTime

      expect(duration).toBeGreaterThanOrEqual(200)
      expect(duration).toBeLessThan(500)
    })

    it('should respect custom pollInterval', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const locksDir = path.join(tmpDir, '.locks')

      const download1 = downloadWithLock(`${baseUrl}/slow-download`, destPath, {
        locksDir,
        pollInterval: 20,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const startTime = Date.now()
      const download2 = downloadWithLock(`${baseUrl}/slow-download`, destPath, {
        locksDir,
        pollInterval: 20,
      })

      await Promise.all([download1, download2])
      const duration = Date.now() - startTime

      expect(duration).toBeGreaterThanOrEqual(20)
    })

    it('should use custom locksDir', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')
      const customLocksDir = path.join(tmpDir, 'custom-locks')

      await downloadWithLock(`${baseUrl}/test-file`, destPath, {
        locksDir: customLocksDir,
      })

      const fs = await import('node:fs/promises')
      const exists = await fs
        .access(customLocksDir)
        .then(() => true)
        .catch(() => false)
      expect(exists).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should throw error when download fails', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')

      await expect(
        downloadWithLock(`${baseUrl}/error`, destPath),
      ).rejects.toThrow()
    })

    it('should throw error when URL is invalid', async () => {
      const destPath = path.join(tmpDir, 'test-file.txt')

      await expect(downloadWithLock('invalid-url', destPath)).rejects.toThrow()
    })
  })
})
