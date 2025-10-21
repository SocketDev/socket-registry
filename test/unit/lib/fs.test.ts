/**
 * @fileoverview Tests for file system utilities.
 *
 * Validates fs operations, glob matching, and directory traversal functions.
 */

import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  findUp,
  findUpSync,
  isDir,
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
  safeDelete,
  safeDeleteSync,
  safeReadFile,
  safeReadFileSync,
  safeStats,
  safeStatsSync,
  uniqueSync,
  writeJson,
  writeJsonSync,
} from '@socketsecurity/lib/fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('fs utilities', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'socket-registry-fs-test-'),
    )
  })

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors.
    }
  })

  describe('directory operations', () => {
    describe('isDir', () => {
      it('should return true for directories', async () => {
        const result = await isDir(testDir)
        expect(result).toBe(true)
      })

      it('should return false for files', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'content')
        const result = await isDir(filePath)
        expect(result).toBe(false)
      })

      it('should return false for non-existent paths', async () => {
        const result = await isDir(path.join(testDir, 'non-existent'))
        expect(result).toBe(false)
      })
    })

    describe('isDirSync', () => {
      it('should return true for directories', () => {
        const result = isDirSync(testDir)
        expect(result).toBe(true)
      })

      it('should return false for files', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'content')
        const result = isDirSync(filePath)
        expect(result).toBe(false)
      })

      it('should return false for non-existent paths', () => {
        const result = isDirSync(path.join(testDir, 'non-existent'))
        expect(result).toBe(false)
      })
    })

    describe('isDirEmptySync', () => {
      it('should return true for empty directories', () => {
        const result = isDirEmptySync(testDir)
        expect(result).toBe(true)
      })

      it('should return false for directories with files', async () => {
        await fs.writeFile(path.join(testDir, 'file.txt'), 'content')
        const result = isDirEmptySync(testDir)
        expect(result).toBe(false)
      })

      it('should return false for directories with subdirectories', async () => {
        await fs.mkdir(path.join(testDir, 'subdir'))
        const result = isDirEmptySync(testDir)
        expect(result).toBe(false)
      })

      it('should respect ignore patterns', async () => {
        await fs.mkdir(path.join(testDir, 'node_modules'))
        const result = isDirEmptySync(testDir, { ignore: ['node_modules'] })
        expect(result).toBe(true)
      })
    })

    describe('readDirNames', () => {
      it('should return empty array for empty directory', async () => {
        const result = await readDirNames(testDir)
        expect(result).toEqual([])
      })

      it('should return directory names', async () => {
        await fs.mkdir(path.join(testDir, 'dir1'))
        await fs.mkdir(path.join(testDir, 'dir2'))
        const result = await readDirNames(testDir)
        expect(result).toEqual(['dir1', 'dir2'])
      })

      it('should sort directory names by default', async () => {
        await fs.mkdir(path.join(testDir, 'z-dir'))
        await fs.mkdir(path.join(testDir, 'a-dir'))
        await fs.mkdir(path.join(testDir, 'm-dir'))
        const result = await readDirNames(testDir)
        expect(result).toEqual(['a-dir', 'm-dir', 'z-dir'])
      })

      it('should filter empty directories when includeEmpty is false', async () => {
        await fs.mkdir(path.join(testDir, 'empty-dir'))
        await fs.mkdir(path.join(testDir, 'non-empty-dir'))
        await fs.writeFile(
          path.join(testDir, 'non-empty-dir', 'file.txt'),
          'content',
        )
        const result = await readDirNames(testDir, { includeEmpty: false })
        expect(result).toEqual(['non-empty-dir'])
      })

      it('should respect ignore patterns', async () => {
        await fs.mkdir(path.join(testDir, 'node_modules'))
        await fs.writeFile(
          path.join(testDir, 'node_modules', 'file.txt'),
          'content',
        )
        await fs.mkdir(path.join(testDir, 'src'))
        await fs.writeFile(path.join(testDir, 'src', 'file.txt'), 'content')
        const result = await readDirNames(testDir, {
          ignore: ['**/node_modules'],
        })
        expect(result.length).toBeGreaterThan(0)
        expect(result).toContain('src')
      })
    })

    describe('readDirNamesSync', () => {
      it('should return empty array for empty directory', () => {
        const result = readDirNamesSync(testDir)
        expect(result).toEqual([])
      })

      it('should return directory names', async () => {
        await fs.mkdir(path.join(testDir, 'dir1'))
        await fs.mkdir(path.join(testDir, 'dir2'))
        const result = readDirNamesSync(testDir)
        expect(result).toEqual(['dir1', 'dir2'])
      })

      it('should sort directory names by default', async () => {
        await fs.mkdir(path.join(testDir, 'z-dir'))
        await fs.mkdir(path.join(testDir, 'a-dir'))
        await fs.mkdir(path.join(testDir, 'm-dir'))
        const result = readDirNamesSync(testDir)
        expect(result).toEqual(['a-dir', 'm-dir', 'z-dir'])
      })
    })
  })

  describe('file operations', () => {
    describe('readFileBinary', () => {
      it('should read file as Buffer', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'test content')
        const result = await readFileBinary(filePath)
        expect(Buffer.isBuffer(result)).toBe(true)
        expect(result.toString('utf8')).toBe('test content')
      })
    })

    describe('readFileBinarySync', () => {
      it('should read file as Buffer', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'test content')
        const result = readFileBinarySync(filePath)
        expect(Buffer.isBuffer(result)).toBe(true)
        expect(result.toString('utf8')).toBe('test content')
      })
    })

    describe('readFileUtf8', () => {
      it('should read file as UTF-8 string', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'test content')
        const result = await readFileUtf8(filePath)
        expect(result).toBe('test content')
      })

      it('should handle Unicode characters', async () => {
        const filePath = path.join(testDir, 'unicode.txt')
        const content = 'Hello 世界 🌍'
        await fs.writeFile(filePath, content, 'utf8')
        const result = await readFileUtf8(filePath)
        expect(result).toBe(content)
      })
    })

    describe('readFileUtf8Sync', () => {
      it('should read file as UTF-8 string', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'test content')
        const result = readFileUtf8Sync(filePath)
        expect(result).toBe('test content')
      })

      it('should handle Unicode characters', async () => {
        const filePath = path.join(testDir, 'unicode.txt')
        const content = 'Hello 世界 🌍'
        await fs.writeFile(filePath, content, 'utf8')
        const result = readFileUtf8Sync(filePath)
        expect(result).toBe(content)
      })
    })

    describe('safeReadFile', () => {
      it('should read existing file as Buffer', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'content')
        const result = await safeReadFile(filePath)
        expect(Buffer.isBuffer(result)).toBe(true)
        expect(result?.toString('utf8')).toBe('content')
      })

      it('should read existing file as string with encoding', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'content')
        const result = await safeReadFile(filePath, { encoding: 'utf8' })
        expect(typeof result).toBe('string')
        expect(result).toBe('content')
      })

      it('should return undefined for non-existent file', async () => {
        const result = await safeReadFile(
          path.join(testDir, 'non-existent.txt'),
        )
        expect(result).toBeUndefined()
      })
    })

    describe('safeReadFileSync', () => {
      it('should read existing file as Buffer', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'content')
        const result = safeReadFileSync(filePath)
        expect(Buffer.isBuffer(result)).toBe(true)
        expect(result?.toString('utf8')).toBe('content')
      })

      it('should read existing file as string with encoding', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'content')
        const result = safeReadFileSync(filePath, { encoding: 'utf8' })
        expect(typeof result).toBe('string')
        expect(result).toBe('content')
      })

      it('should return undefined for non-existent file', () => {
        const result = safeReadFileSync(path.join(testDir, 'non-existent.txt'))
        expect(result).toBeUndefined()
      })
    })
  })

  describe('JSON operations', () => {
    describe('readJson', () => {
      it('should read and parse JSON file', async () => {
        const filePath = path.join(testDir, 'test.json')
        const data = { name: 'test', value: 42 }
        await fs.writeFile(filePath, JSON.stringify(data))
        const result = await readJson(filePath)
        expect(result).toEqual(data)
      })

      it('should handle empty JSON objects', async () => {
        const filePath = path.join(testDir, 'empty.json')
        await fs.writeFile(filePath, '{}')
        const result = await readJson(filePath)
        expect(result).toEqual({})
      })

      it('should handle JSON arrays', async () => {
        const filePath = path.join(testDir, 'array.json')
        const data = [1, 2, 3, 4, 5]
        await fs.writeFile(filePath, JSON.stringify(data))
        const result = await readJson(filePath)
        expect(result).toEqual(data)
      })

      it('should throw on invalid JSON by default', async () => {
        const filePath = path.join(testDir, 'invalid.json')
        await fs.writeFile(filePath, 'invalid json {')
        await expect(readJson(filePath)).rejects.toThrow()
      })

      it('should return undefined on invalid JSON when throws is false', async () => {
        const filePath = path.join(testDir, 'invalid.json')
        await fs.writeFile(filePath, 'invalid json {')
        const result = await readJson(filePath, { throws: false })
        expect(result).toBeUndefined()
      })
    })

    describe('readJsonSync', () => {
      it('should read and parse JSON file', async () => {
        const filePath = path.join(testDir, 'test.json')
        const data = { name: 'test', value: 42 }
        await fs.writeFile(filePath, JSON.stringify(data))
        const result = readJsonSync(filePath)
        expect(result).toEqual(data)
      })

      it('should handle empty JSON objects', async () => {
        const filePath = path.join(testDir, 'empty.json')
        await fs.writeFile(filePath, '{}')
        const result = readJsonSync(filePath)
        expect(result).toEqual({})
      })

      it('should throw on invalid JSON by default', async () => {
        const filePath = path.join(testDir, 'invalid.json')
        await fs.writeFile(filePath, 'invalid json {')
        expect(() => readJsonSync(filePath)).toThrow()
      })

      it('should return undefined on invalid JSON when throws is false', async () => {
        const filePath = path.join(testDir, 'invalid.json')
        await fs.writeFile(filePath, 'invalid json {')
        const result = readJsonSync(filePath, { throws: false })
        expect(result).toBeUndefined()
      })
    })

    describe('writeJson', () => {
      it('should write JSON to file', async () => {
        const filePath = path.join(testDir, 'output.json')
        const data = { name: 'test', value: 42 }
        await writeJson(filePath, data)
        const content = await fs.readFile(filePath, 'utf8')
        expect(JSON.parse(content)).toEqual(data)
      })

      it('should format with spaces when specified', async () => {
        const filePath = path.join(testDir, 'formatted.json')
        const data = { name: 'test', value: 42 }
        await writeJson(filePath, data, { spaces: 2 })
        const content = await fs.readFile(filePath, 'utf8')
        expect(content).toContain('  "name"')
        expect(content).toContain('  "value"')
      })

      it('should add final EOL when finalEOL is true', async () => {
        const filePath = path.join(testDir, 'eol.json')
        const data = { test: true }
        await writeJson(filePath, data, { finalEOL: true })
        const content = await fs.readFile(filePath, 'utf8')
        expect(content.endsWith('\n')).toBe(true)
      })

      it('should handle empty objects', async () => {
        const filePath = path.join(testDir, 'empty.json')
        await writeJson(filePath, {})
        const content = await fs.readFile(filePath, 'utf8')
        expect(JSON.parse(content)).toEqual({})
      })
    })

    describe('writeJsonSync', () => {
      it('should write JSON to file', async () => {
        const filePath = path.join(testDir, 'output.json')
        const data = { name: 'test', value: 42 }
        writeJsonSync(filePath, data)
        const content = await fs.readFile(filePath, 'utf8')
        expect(JSON.parse(content)).toEqual(data)
      })

      it('should format with spaces when specified', async () => {
        const filePath = path.join(testDir, 'formatted.json')
        const data = { name: 'test', value: 42 }
        writeJsonSync(filePath, data, { spaces: 2 })
        const content = await fs.readFile(filePath, 'utf8')
        expect(content).toContain('  "name"')
        expect(content).toContain('  "value"')
      })

      it('should add final EOL when finalEOL is true', async () => {
        const filePath = path.join(testDir, 'eol.json')
        const data = { test: true }
        writeJsonSync(filePath, data, { finalEOL: true })
        const content = await fs.readFile(filePath, 'utf8')
        expect(content.endsWith('\n')).toBe(true)
      })
    })
  })

  describe('safe operations', () => {
    describe('safeStats', () => {
      it('should return stats for existing file', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'content')
        const result = await safeStats(filePath)
        expect(result).toBeDefined()
        expect(result?.isFile()).toBe(true)
      })

      it('should return undefined for non-existent file', async () => {
        const result = await safeStats(path.join(testDir, 'non-existent.txt'))
        expect(result).toBeUndefined()
      })

      it('should return stats for directories', async () => {
        const result = await safeStats(testDir)
        expect(result).toBeDefined()
        expect(result?.isDirectory()).toBe(true)
      })
    })

    describe('safeStatsSync', () => {
      it('should return stats for existing file', async () => {
        const filePath = path.join(testDir, 'test.txt')
        await fs.writeFile(filePath, 'content')
        const result = safeStatsSync(filePath)
        expect(result).toBeDefined()
        expect(result?.isFile()).toBe(true)
      })

      it('should return undefined for non-existent file', () => {
        const result = safeStatsSync(path.join(testDir, 'non-existent.txt'))
        expect(result).toBeUndefined()
      })

      it('should return stats for directories', () => {
        const result = safeStatsSync(testDir)
        expect(result).toBeDefined()
        expect(result?.isDirectory()).toBe(true)
      })
    })

    describe('safeDelete', () => {
      it('should delete existing file', async () => {
        const filePath = path.join(testDir, 'to-delete.txt')
        await fs.writeFile(filePath, 'content')
        await safeDelete(filePath)
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false)
        expect(exists).toBe(false)
      })

      it('should delete directories recursively', async () => {
        const dirPath = path.join(testDir, 'to-delete-dir')
        await fs.mkdir(dirPath)
        await fs.writeFile(path.join(dirPath, 'file.txt'), 'content')
        await safeDelete(dirPath)
        const exists = await fs
          .access(dirPath)
          .then(() => true)
          .catch(() => false)
        expect(exists).toBe(false)
      })

      it('should not throw for non-existent paths', async () => {
        await expect(
          safeDelete(path.join(testDir, 'non-existent')),
        ).resolves.toBeUndefined()
      })
    })

    describe('safeDeleteSync', () => {
      it('should delete existing file', async () => {
        const filePath = path.join(testDir, 'to-delete.txt')
        await fs.writeFile(filePath, 'content')
        safeDeleteSync(filePath)
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false)
        expect(exists).toBe(false)
      })

      it('should delete directories recursively', async () => {
        const dirPath = path.join(testDir, 'to-delete-dir')
        await fs.mkdir(dirPath)
        await fs.writeFile(path.join(dirPath, 'file.txt'), 'content')
        safeDeleteSync(dirPath)
        const exists = await fs
          .access(dirPath)
          .then(() => true)
          .catch(() => false)
        expect(exists).toBe(false)
      })

      it('should not throw for non-existent paths', () => {
        expect(() =>
          safeDeleteSync(path.join(testDir, 'non-existent')),
        ).not.toThrow()
      })
    })
  })

  describe('file search operations', () => {
    describe('findUp', () => {
      it('should find file in current directory', async () => {
        const filePath = path.join(testDir, 'target.txt')
        await fs.writeFile(filePath, 'content')
        const result = await findUp('target.txt', { cwd: testDir })
        expect(result).toBe(filePath)
      })

      it('should find file in parent directory', async () => {
        const subDir = path.join(testDir, 'sub')
        await fs.mkdir(subDir)
        const filePath = path.join(testDir, 'target.txt')
        await fs.writeFile(filePath, 'content')
        const result = await findUp('target.txt', { cwd: subDir })
        expect(result).toBe(filePath)
      })

      it('should return undefined when file not found', async () => {
        const result = await findUp('non-existent.txt', { cwd: testDir })
        expect(result).toBeUndefined()
      })

      it('should find directories when onlyDirectories is true', async () => {
        const dirPath = path.join(testDir, 'target-dir')
        await fs.mkdir(dirPath)
        const result = await findUp('target-dir', {
          cwd: testDir,
          onlyDirectories: true,
        })
        expect(result).toBe(dirPath)
      })

      it('should find files when onlyFiles is true', async () => {
        const filePath = path.join(testDir, 'target.txt')
        await fs.writeFile(filePath, 'content')
        const result = await findUp('target.txt', {
          cwd: testDir,
          onlyFiles: true,
        })
        expect(result).toBe(filePath)
      })
    })

    describe('findUpSync', () => {
      it('should find file in current directory', async () => {
        const filePath = path.join(testDir, 'target.txt')
        await fs.writeFile(filePath, 'content')
        const result = findUpSync('target.txt', { cwd: testDir })
        expect(result).toBe(filePath)
      })

      it('should find file in parent directory', async () => {
        const subDir = path.join(testDir, 'sub')
        await fs.mkdir(subDir)
        const filePath = path.join(testDir, 'target.txt')
        await fs.writeFile(filePath, 'content')
        const result = findUpSync('target.txt', { cwd: subDir })
        expect(result).toBe(filePath)
      })

      it('should return undefined when file not found', () => {
        const result = findUpSync('non-existent.txt', { cwd: testDir })
        expect(result).toBeUndefined()
      })

      it('should find directories when onlyDirectories is true', async () => {
        const dirPath = path.join(testDir, 'target-dir')
        await fs.mkdir(dirPath)
        const result = findUpSync('target-dir', {
          cwd: testDir,
          onlyDirectories: true,
        })
        expect(result).toBe(dirPath)
      })

      it('should find files when onlyFiles is true', async () => {
        const filePath = path.join(testDir, 'target.txt')
        await fs.writeFile(filePath, 'content')
        const result = findUpSync('target.txt', {
          cwd: testDir,
          onlyFiles: true,
        })
        expect(result).toBe(filePath)
      })

      it('should stop at stopAt directory', async () => {
        const subDir = path.join(testDir, 'sub')
        await fs.mkdir(subDir)
        const filePath = path.join(testDir, 'target.txt')
        await fs.writeFile(filePath, 'content')
        const result = findUpSync('target.txt', { cwd: subDir, stopAt: subDir })
        expect(result).toBeUndefined()
      })
    })
  })

  describe('utility operations', () => {
    describe('isSymLinkSync', () => {
      it('should return false for regular files', async () => {
        const filePath = path.join(testDir, 'regular.txt')
        await fs.writeFile(filePath, 'content')
        const result = isSymLinkSync(filePath)
        expect(result).toBe(false)
      })

      it('should return false for directories', () => {
        const result = isSymLinkSync(testDir)
        expect(result).toBe(false)
      })

      it('should return false for non-existent paths', () => {
        const result = isSymLinkSync(path.join(testDir, 'non-existent'))
        expect(result).toBe(false)
      })
    })

    describe('uniqueSync', () => {
      it('should return original path if file does not exist', () => {
        const filePath = path.join(testDir, 'unique.txt')
        const result = uniqueSync(filePath)
        expect(result).toBe(filePath)
      })

      it('should return unique path if file exists', async () => {
        const filePath = path.join(testDir, 'unique.txt')
        await fs.writeFile(filePath, 'content')
        const result = uniqueSync(filePath)
        expect(result).not.toBe(filePath)
        expect(result).toContain('unique')
        expect(path.dirname(result)).toBe(testDir)
      })

      it('should handle files without extensions', async () => {
        const filePath = path.join(testDir, 'unique')
        await fs.writeFile(filePath, 'content')
        const result = uniqueSync(filePath)
        expect(result).not.toBe(filePath)
        expect(result).toContain('unique')
      })

      it('should generate multiple unique paths', async () => {
        const filePath = path.join(testDir, 'unique.txt')
        await fs.writeFile(filePath, 'content')
        const result1 = uniqueSync(filePath)
        await fs.writeFile(result1, 'content')
        const result2 = uniqueSync(filePath)
        expect(result2).not.toBe(filePath)
        expect(result2).not.toBe(result1)
      })
    })
  })
})
