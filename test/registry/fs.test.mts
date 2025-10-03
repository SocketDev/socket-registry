import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  findUp,
  findUpSync,
  isDirEmptySync,
  isDirSync,
  isSymLinkSync,
  readDirNames,
  readDirNamesSync,
  readFileBinary,
  readFileBinarySync,
  readFileUtf8,
  readFileUtf8Sync,
  readJson,
  readJsonSync,
  remove,
  removeSync,
  safeReadFile,
  safeReadFileSync,
  safeStatsSync,
  uniqueSync,
  writeJson,
  writeJsonSync,
} from '../../registry/dist/lib/fs.js'
import { normalizePath } from '../../registry/dist/lib/path.js'
import { trash } from '../../scripts/utils/fs.mjs'

describe('fs module', () => {
  let tmpDir: string
  let testFile: string
  let testJson: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-test-'))
    testFile = path.join(tmpDir, 'test.txt')
    testJson = path.join(tmpDir, 'test.json')
  })

  afterEach(async () => {
    await trash(tmpDir)
  })

  describe('isDirSync', () => {
    it('should return true for directories', () => {
      expect(isDirSync(tmpDir)).toBe(true)
    })

    it('should return false for files', () => {
      fs.writeFileSync(testFile, 'content')
      expect(isDirSync(testFile)).toBe(false)
    })

    it('should return false for non-existent paths', () => {
      expect(isDirSync(path.join(tmpDir, 'nonexistent'))).toBe(false)
    })
  })

  describe('isDirEmptySync', () => {
    it('should return true for empty directories', () => {
      const emptyDir = path.join(tmpDir, 'empty')
      fs.mkdirSync(emptyDir)
      expect(isDirEmptySync(emptyDir)).toBe(true)
    })

    it('should return false for non-empty directories', () => {
      fs.writeFileSync(testFile, 'content')
      expect(isDirEmptySync(tmpDir)).toBe(false)
    })

    it('should return false for files', () => {
      fs.writeFileSync(testFile, 'content')
      expect(isDirEmptySync(testFile)).toBe(false)
    })

    it('should return false for non-existent paths', () => {
      expect(isDirEmptySync(path.join(tmpDir, 'nonexistent'))).toBe(false)
    })
  })

  describe('isSymLinkSync', () => {
    it('should return true for symlinks', () => {
      fs.writeFileSync(testFile, 'content')
      const linkPath = path.join(tmpDir, 'link')
      fs.symlinkSync(testFile, linkPath)
      expect(isSymLinkSync(linkPath)).toBe(true)
    })

    it('should return false for regular files', () => {
      fs.writeFileSync(testFile, 'content')
      expect(isSymLinkSync(testFile)).toBe(false)
    })

    it('should return false for directories', () => {
      expect(isSymLinkSync(tmpDir)).toBe(false)
    })

    it('should return false for non-existent paths', () => {
      expect(isSymLinkSync(path.join(tmpDir, 'nonexistent'))).toBe(false)
    })
  })

  describe('readDirNamesSync', () => {
    it('should read directory names', () => {
      fs.mkdirSync(path.join(tmpDir, 'dir1'))
      fs.mkdirSync(path.join(tmpDir, 'dir2'))
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content')

      const dirs = readDirNamesSync(tmpDir)
      expect(dirs).toContain('dir1')
      expect(dirs).toContain('dir2')
      expect(dirs).not.toContain('file.txt')
    })

    it('should return empty array for empty directories', () => {
      const emptyDir = path.join(tmpDir, 'empty')
      fs.mkdirSync(emptyDir)
      expect(readDirNamesSync(emptyDir)).toEqual([])
    })

    it('should return empty array for non-existent paths', () => {
      expect(readDirNamesSync(path.join(tmpDir, 'nonexistent'))).toEqual([])
    })
  })

  describe('readDirNames', () => {
    it('should read directory names asynchronously', async () => {
      fs.mkdirSync(path.join(tmpDir, 'dir1'))
      fs.mkdirSync(path.join(tmpDir, 'dir2'))
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content')

      const dirs = await readDirNames(tmpDir)
      expect(dirs).toContain('dir1')
      expect(dirs).toContain('dir2')
      expect(dirs).not.toContain('file.txt')
    })

    it('should return empty array for non-existent paths', async () => {
      const dirs = await readDirNames(path.join(tmpDir, 'nonexistent'))
      expect(dirs).toEqual([])
    })
  })

  describe('readFileUtf8', () => {
    it('should read text files as UTF-8', async () => {
      const content = 'Hello, World! 👋'
      fs.writeFileSync(testFile, content, 'utf8')
      const result = await readFileUtf8(testFile)
      expect(result).toBe(content)
    })

    it('should handle empty files', async () => {
      fs.writeFileSync(testFile, '')
      const result = await readFileUtf8(testFile)
      expect(result).toBe('')
    })

    it('should reject for non-existent files', async () => {
      await expect(
        readFileUtf8(path.join(tmpDir, 'nonexistent')),
      ).rejects.toThrow()
    })
  })

  describe('readFileBinary', () => {
    it('should read files as binary Buffer', async () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04])
      fs.writeFileSync(testFile, buffer)
      const result = await readFileBinary(testFile)
      expect(result).toEqual(buffer)
    })

    it('should handle text files', async () => {
      const content = 'Hello'
      fs.writeFileSync(testFile, content)
      const result = await readFileBinary(testFile)
      expect(result.toString()).toBe(content)
    })
  })

  describe('readFileUtf8Sync', () => {
    it('should read text files as UTF-8 synchronously', () => {
      const content = 'Hello, UTF-8!'
      fs.writeFileSync(testFile, content)
      const result = readFileUtf8Sync(testFile)
      expect(result).toBe(content)
    })

    it('should handle empty files synchronously', () => {
      fs.writeFileSync(testFile, '')
      const result = readFileUtf8Sync(testFile)
      expect(result).toBe('')
    })

    it('should throw for non-existent files', () => {
      expect(() => {
        readFileUtf8Sync(path.join(tmpDir, 'nonexistent'))
      }).toThrow()
    })
  })

  describe('readFileBinarySync', () => {
    it('should read files as binary Buffer synchronously', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04])
      fs.writeFileSync(testFile, buffer)
      const result = readFileBinarySync(testFile)
      expect(result).toEqual(buffer)
    })

    it('should handle text files synchronously', () => {
      const content = 'Hello'
      fs.writeFileSync(testFile, content)
      const result = readFileBinarySync(testFile)
      expect(result.toString()).toBe(content)
    })

    it('should throw for non-existent files', () => {
      expect(() => {
        readFileBinarySync(path.join(tmpDir, 'nonexistent'))
      }).toThrow()
    })
  })

  describe('safeReadFile', () => {
    it('should read existing files', async () => {
      const content = 'Test content'
      fs.writeFileSync(testFile, content)
      const result = await safeReadFile(testFile)
      expect(result?.toString()).toBe(content)
    })

    it('should return undefined for non-existent files', async () => {
      const result = await safeReadFile(path.join(tmpDir, 'nonexistent'))
      expect(result).toBe(undefined)
    })

    it('should handle encoding option', async () => {
      const content = 'UTF-8 content'
      fs.writeFileSync(testFile, content)
      // @ts-expect-error - Testing runtime behavior with encoding string.
      const result = await safeReadFile(testFile, 'utf8')
      expect(result).toBe(content)
    })
  })

  describe('safeReadFileSync', () => {
    it('should read existing files synchronously', () => {
      const content = 'Test content'
      fs.writeFileSync(testFile, content)
      const result = safeReadFileSync(testFile)
      expect(result?.toString()).toBe(content)
    })

    it('should return undefined for non-existent files', () => {
      const result = safeReadFileSync(path.join(tmpDir, 'nonexistent'))
      expect(result).toBe(undefined)
    })
  })

  describe('safeStatsSync', () => {
    it('should return stats for existing paths', () => {
      fs.writeFileSync(testFile, 'content')
      const stats = safeStatsSync(testFile)
      expect(stats).toBeDefined()
      expect(stats?.isFile()).toBe(true)
    })

    it('should return undefined for non-existent paths', () => {
      const stats = safeStatsSync(path.join(tmpDir, 'nonexistent'))
      expect(stats).toBe(undefined)
    })
  })

  describe('readJson', () => {
    it('should read and parse JSON files', async () => {
      const data = { name: 'test', value: 123 }
      fs.writeFileSync(testJson, JSON.stringify(data))
      const result = await readJson(testJson)
      expect(result).toEqual(data)
    })

    it('should handle arrays', async () => {
      const data = [1, 2, 3]
      fs.writeFileSync(testJson, JSON.stringify(data))
      const result = await readJson(testJson)
      expect(result).toEqual(data)
    })

    it('should reject for invalid JSON', async () => {
      fs.writeFileSync(testJson, 'not valid json')
      await expect(readJson(testJson)).rejects.toThrow()
    })
  })

  describe('readJsonSync', () => {
    it('should read and parse JSON files synchronously', () => {
      const data = { name: 'test', value: 123 }
      fs.writeFileSync(testJson, JSON.stringify(data))
      const result = readJsonSync(testJson)
      expect(result).toEqual(data)
    })

    it('should throw for invalid JSON', () => {
      fs.writeFileSync(testJson, 'not valid json')
      expect(() => readJsonSync(testJson)).toThrow()
    })
  })

  describe('writeJson', () => {
    it('should write JSON files', async () => {
      const data = { name: 'test', value: 123 }
      await writeJson(testJson, data)
      const content = fs.readFileSync(testJson, 'utf8')
      expect(JSON.parse(content)).toEqual(data)
    })

    it('should format JSON with indentation', async () => {
      const data = { a: 1, b: 2 }
      await writeJson(testJson, data, { spaces: 2 })
      const content = fs.readFileSync(testJson, 'utf8')
      expect(content).toContain('  ')
    })

    it('should handle replacer function', async () => {
      const data = { a: 1, b: undefined, c: 3 }
      await writeJson(testJson, data, {
        replacer: (_key: string, value: any) =>
          value === undefined ? null : value,
      })
      const result = JSON.parse(fs.readFileSync(testJson, 'utf8'))
      expect(result.b).toBeNull()
    })
  })

  describe('writeJsonSync', () => {
    it('should write JSON files synchronously', () => {
      const data = { name: 'test', value: 123 }
      writeJsonSync(testJson, data)
      const content = fs.readFileSync(testJson, 'utf8')
      expect(JSON.parse(content)).toEqual(data)
    })
  })

  describe('remove', () => {
    it('should remove files', async () => {
      fs.writeFileSync(testFile, 'content')
      await remove(testFile)
      expect(fs.existsSync(testFile)).toBe(false)
    })

    it('should remove directories recursively', async () => {
      const dir = path.join(tmpDir, 'nested')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'file.txt'), 'content')
      await remove(dir)
      expect(fs.existsSync(dir)).toBe(false)
    })

    it('should not throw for non-existent paths', async () => {
      await expect(remove(path.join(tmpDir, 'nonexistent'))).resolves.toBe(
        undefined,
      )
    })
  })

  describe('removeSync', () => {
    it('should remove files synchronously', () => {
      fs.writeFileSync(testFile, 'content')
      removeSync(testFile)
      expect(fs.existsSync(testFile)).toBe(false)
    })

    it('should remove directories recursively', () => {
      const dir = path.join(tmpDir, 'nested')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'file.txt'), 'content')
      removeSync(dir)
      expect(fs.existsSync(dir)).toBe(false)
    })
  })

  describe('uniqueSync', () => {
    it('should return same path if not exists', () => {
      const uniquePath = path.join(tmpDir, 'unique.txt')
      const result = uniqueSync(uniquePath)
      expect(result).toBe(uniquePath)
    })

    it('should add number suffix for existing files', () => {
      const filePath = path.join(tmpDir, 'test.txt')
      fs.writeFileSync(filePath, 'content')
      const result = uniqueSync(filePath)
      expect(result).toBe(normalizePath(path.join(tmpDir, 'test-1.txt')))
    })

    it('should increment number for multiple conflicts', () => {
      const base = path.join(tmpDir, 'test.txt')
      fs.writeFileSync(base, 'content')
      fs.writeFileSync(path.join(tmpDir, 'test-1.txt'), 'content')
      const result = uniqueSync(base)
      expect(result).toBe(normalizePath(path.join(tmpDir, 'test-2.txt')))
    })

    it('should handle files with extensions', () => {
      const filePath = path.join(tmpDir, 'file.json')
      fs.writeFileSync(filePath, '{}')
      const result = uniqueSync(filePath)
      expect(result).toBe(normalizePath(path.join(tmpDir, 'file-1.json')))
    })
  })

  describe('findUpSync', () => {
    it('should find file in current directory', () => {
      const searchFile = 'target.txt'
      fs.writeFileSync(path.join(tmpDir, searchFile), 'found')
      const result = findUpSync(searchFile, { cwd: tmpDir })
      expect(result).toBe(normalizePath(path.join(tmpDir, searchFile)))
    })

    it('should find file in parent directories', () => {
      const subDir = path.join(tmpDir, 'sub', 'dir')
      fs.mkdirSync(subDir, { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'target.txt'), 'found')
      const result = findUpSync('target.txt', { cwd: subDir })
      expect(result).toBe(normalizePath(path.join(tmpDir, 'target.txt')))
    })

    it('should return undefined if not found', () => {
      const result = findUpSync('nonexistent.txt', { cwd: tmpDir })
      expect(result).toBe(undefined)
    })

    it('should handle custom stop directory', () => {
      const subDir = path.join(tmpDir, 'sub')
      fs.mkdirSync(subDir)
      fs.writeFileSync(path.join(tmpDir, 'target.txt'), 'found')
      const result = findUpSync('target.txt', {
        cwd: subDir,
        stopAt: subDir,
      })
      expect(result).toBe(undefined)
    })
  })

  describe('findUp', () => {
    it('should find file asynchronously', async () => {
      const searchFile = 'target.txt'
      fs.writeFileSync(path.join(tmpDir, searchFile), 'found')
      const result = await findUp(searchFile, { cwd: tmpDir })
      expect(result).toBe(normalizePath(path.join(tmpDir, searchFile)))
    })

    it('should find file in parent directories', async () => {
      const subDir = path.join(tmpDir, 'sub', 'dir')
      fs.mkdirSync(subDir, { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'target.txt'), 'found')
      const result = await findUp('target.txt', { cwd: subDir })
      expect(result).toBe(normalizePath(path.join(tmpDir, 'target.txt')))
    })

    it('should return undefined if not found', async () => {
      const result = await findUp('nonexistent.txt', { cwd: tmpDir })
      expect(result).toBe(undefined)
    })
  })
})
