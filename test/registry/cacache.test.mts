import { mkdtempSync } from 'node:fs'
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

import * as cacache from '../../registry/dist/lib/cacache.js'
import { trash } from '../../scripts/utils/fs.mjs'

// Test key for cache operations.
const TEST_KEY = 'test-cacache-key'
const TEST_DATA = 'test data content'

describe('cacache module', () => {
  let testCacheDir: string
  let originalEnv: string | undefined

  beforeAll(() => {
    // Create a temporary directory for test-specific cacache.
    testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))
    // Override cacache directory for tests.
    originalEnv = process.env['SOCKET_CACACHE_DIR']
    process.env['SOCKET_CACACHE_DIR'] = testCacheDir
  })

  afterAll(async () => {
    // Restore original environment.
    if (originalEnv === undefined) {
      delete process.env['SOCKET_CACACHE_DIR']
    } else {
      process.env['SOCKET_CACACHE_DIR'] = originalEnv
    }
    // Clean up test cache directory.
    await trash(testCacheDir)
  })

  beforeEach(async () => {
    // Remove test key before each test for defensive cleanup.
    await cacache.remove(TEST_KEY).catch(() => {
      // Ignore cleanup errors.
    })
  })

  afterEach(async () => {
    // Clean up test entries after each test.
    await cacache.remove(TEST_KEY).catch(() => {
      // Ignore cleanup errors.
    })
  })

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cacache.put(TEST_KEY, TEST_DATA)
      await cacache.clear()

      const entry = await cacache.safeGet(TEST_KEY)
      expect(entry).toBeUndefined()
    })
  })

  describe('get', () => {
    it('should retrieve data from cache', async () => {
      await cacache.put(TEST_KEY, TEST_DATA)
      const entry = await cacache.get(TEST_KEY)

      expect(entry).toBeDefined()
      expect(entry.data).toBeInstanceOf(Buffer)
      expect(entry.data.toString()).toBe(TEST_DATA)
      expect(entry.integrity).toBeTruthy()
      expect(entry.size).toBe(TEST_DATA.length)
    })

    it('should support Buffer data', async () => {
      const buffer = Buffer.from(TEST_DATA)
      await cacache.put(TEST_KEY, buffer)
      const entry = await cacache.get(TEST_KEY)

      expect(entry.data.toString()).toBe(TEST_DATA)
    })

    it('should throw when getting non-existent key', async () => {
      await expect(cacache.get('non-existent-key')).rejects.toThrow()
    })
  })

  describe('put', () => {
    it('should store data in cache', async () => {
      await cacache.put(TEST_KEY, TEST_DATA)

      const entry = await cacache.get(TEST_KEY)
      expect(entry.data.toString()).toBe(TEST_DATA)
    })

    it('should accept PutOptions with metadata', async () => {
      const metadata = { foo: 'bar', timestamp: Date.now() }
      await cacache.put(TEST_KEY, TEST_DATA, { metadata })

      const entry = await cacache.get(TEST_KEY)
      expect(entry.metadata).toEqual(metadata)
    })
  })

  describe('remove', () => {
    it('should remove cache entry', async () => {
      await cacache.put(TEST_KEY, TEST_DATA)
      await cacache.remove(TEST_KEY)

      const entry = await cacache.safeGet(TEST_KEY)
      expect(entry).toBeUndefined()
    })
  })

  describe('safeGet', () => {
    it('should return undefined for non-existent key', async () => {
      const entry = await cacache.safeGet('non-existent-key')
      expect(entry).toBeUndefined()
    })

    it('should return entry for existing key', async () => {
      await cacache.put(TEST_KEY, TEST_DATA)
      const entry = await cacache.safeGet(TEST_KEY)

      expect(entry).toBeDefined()
      expect(entry?.data.toString()).toBe(TEST_DATA)
    })
  })

  describe('withTmp', () => {
    it('should provide temporary directory for callback', async () => {
      let tmpDir: string | undefined
      const result = await cacache.withTmp(async tmpDirPath => {
        tmpDir = tmpDirPath
        expect(tmpDirPath).toBeTruthy()
        expect(typeof tmpDirPath).toBe('string')
        return 'test-result'
      })

      expect(result).toBe('test-result')
      expect(tmpDir).toBeTruthy()
    })

    it('should return callback result', async () => {
      const result = await cacache.withTmp(async () => {
        return { value: 42 }
      })

      expect(result).toEqual({ value: 42 })
    })
  })
})
