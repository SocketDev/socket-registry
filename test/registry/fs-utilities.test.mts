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
  readFileUtf8,
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

describe('fs utilities', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `fs-test-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('findUp', () => {
    it('should find file by traversing up', async () => {
      const subDir = path.join(tmpDir, 'sub', 'nested')
      fs.mkdirSync(subDir, { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'target.txt'), 'content')

      const result = await findUp('target.txt', { cwd: subDir })
      expect(result).toBe(path.join(tmpDir, 'target.txt'))
    })

    it('should find directory when onlyDirectories is true', async () => {
      const subDir = path.join(tmpDir, 'sub', 'nested')
      const targetDir = path.join(tmpDir, 'targetdir')
      fs.mkdirSync(subDir, { recursive: true })
      fs.mkdirSync(targetDir)

      const result = await findUp('targetdir', {
        cwd: subDir,
        onlyDirectories: true,
      })
      expect(result).toBe(targetDir)
    })

    it('should find multiple target names', async () => {
      const subDir = path.join(tmpDir, 'sub')
      fs.mkdirSync(subDir)
      fs.writeFileSync(path.join(tmpDir, 'config.json'), '{}')

      const result = await findUp(['package.json', 'config.json'], {
        cwd: subDir,
      })
      expect(result).toBe(path.join(tmpDir, 'config.json'))
    })

    it('should return undefined when not found', async () => {
      const result = await findUp('nonexistent.txt', { cwd: tmpDir })
      expect(result).toBeUndefined()
    })

    it('should handle AbortSignal', async () => {
      const controller = new AbortController()
      controller.abort()

      const result = await findUp('anything', {
        cwd: tmpDir,
        signal: controller.signal,
      })
      expect(result).toBeUndefined()
    })
  })

  describe('findUpSync', () => {
    it('should find file by traversing up synchronously', () => {
      const subDir = path.join(tmpDir, 'sub', 'nested')
      fs.mkdirSync(subDir, { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'target.txt'), 'content')

      const result = findUpSync('target.txt', { cwd: subDir })
      expect(result).toBe(path.join(tmpDir, 'target.txt'))
    })

    it('should stop at specified directory', () => {
      const subDir = path.join(tmpDir, 'sub', 'nested')
      const stopDir = path.join(tmpDir, 'sub')
      fs.mkdirSync(subDir, { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'target.txt'), 'content')
      fs.writeFileSync(path.join(stopDir, 'local.txt'), 'content')

      const result = findUpSync('local.txt', { cwd: subDir, stopAt: stopDir })
      expect(result).toBe(path.join(stopDir, 'local.txt'))
    })

    it('should return undefined when stopAt prevents finding', () => {
      const subDir = path.join(tmpDir, 'sub', 'nested')
      const stopDir = path.join(tmpDir, 'sub')
      fs.mkdirSync(subDir, { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'target.txt'), 'content')

      const result = findUpSync('target.txt', { cwd: subDir, stopAt: stopDir })
      expect(result).toBeUndefined()
    })
  })

  describe('isDirSync', () => {
    it('should return true for directories', () => {
      expect(isDirSync(tmpDir)).toBe(true)
    })

    it('should return false for files', () => {
      const filePath = path.join(tmpDir, 'file.txt')
      fs.writeFileSync(filePath, 'content')
      expect(isDirSync(filePath)).toBe(false)
    })

    it('should return false for non-existent paths', () => {
      expect(isDirSync(path.join(tmpDir, 'nonexistent'))).toBe(false)
    })
  })

  describe('isDirEmptySync', () => {
    it('should return true for empty directory', () => {
      const emptyDir = path.join(tmpDir, 'empty')
      fs.mkdirSync(emptyDir)
      expect(isDirEmptySync(emptyDir)).toBe(true)
    })

    it('should return false for directory with files', () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content')
      expect(isDirEmptySync(tmpDir)).toBe(false)
    })

    it('should return true when only ignored files exist', () => {
      const dirWithIgnored = path.join(tmpDir, 'withignored')
      fs.mkdirSync(dirWithIgnored)
      fs.writeFileSync(path.join(dirWithIgnored, '.gitignore'), 'ignored')
      expect(isDirEmptySync(dirWithIgnored, { ignore: ['.gitignore'] })).toBe(
        true,
      )
    })

    it('should return false for non-existent directory', () => {
      expect(isDirEmptySync(path.join(tmpDir, 'nonexistent'))).toBe(false)
    })
  })

  describe('isSymLinkSync', () => {
    it('should return false for regular files', () => {
      const filePath = path.join(tmpDir, 'file.txt')
      fs.writeFileSync(filePath, 'content')
      expect(isSymLinkSync(filePath)).toBe(false)
    })

    it('should return false for non-existent files', () => {
      expect(isSymLinkSync(path.join(tmpDir, 'nonexistent'))).toBe(false)
    })
  })

  describe('readDirNames', () => {
    it('should read directory names', async () => {
      fs.mkdirSync(path.join(tmpDir, 'dir1'))
      fs.mkdirSync(path.join(tmpDir, 'dir2'))
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content')

      const result = await readDirNames(tmpDir)
      expect(result).toEqual(['dir1', 'dir2'])
    })

    it('should sort directory names by default', async () => {
      fs.mkdirSync(path.join(tmpDir, 'z-last'))
      fs.mkdirSync(path.join(tmpDir, 'a-first'))

      const result = await readDirNames(tmpDir)
      expect(result).toEqual(['a-first', 'z-last'])
    })

    it('should not sort when sort is false', async () => {
      fs.mkdirSync(path.join(tmpDir, 'z-last'))
      fs.mkdirSync(path.join(tmpDir, 'a-first'))

      const result = await readDirNames(tmpDir, { sort: false })
      expect(result.length).toBe(2)
      expect(result.includes('a-first')).toBe(true)
      expect(result.includes('z-last')).toBe(true)
    })

    it('should exclude empty directories when includeEmpty is false', async () => {
      const emptyDir = path.join(tmpDir, 'empty')
      const fullDir = path.join(tmpDir, 'full')
      fs.mkdirSync(emptyDir)
      fs.mkdirSync(fullDir)
      fs.writeFileSync(path.join(fullDir, 'file.txt'), 'content')

      const result = await readDirNames(tmpDir, { includeEmpty: false })
      expect(result).toEqual(['full'])
    })

    it('should return empty array for non-existent directory', async () => {
      const result = await readDirNames(path.join(tmpDir, 'nonexistent'))
      expect(result).toEqual([])
    })
  })

  describe('readDirNamesSync', () => {
    it('should read directory names synchronously', () => {
      fs.mkdirSync(path.join(tmpDir, 'dir1'))
      fs.mkdirSync(path.join(tmpDir, 'dir2'))

      const result = readDirNamesSync(tmpDir)
      expect(result).toEqual(['dir1', 'dir2'])
    })

    it('should return empty array for non-existent directory', () => {
      const result = readDirNamesSync(path.join(tmpDir, 'nonexistent'))
      expect(result).toEqual([])
    })
  })

  describe('readFileBinary', () => {
    it('should read file as binary', async () => {
      const filePath = path.join(tmpDir, 'binary.txt')
      const content = 'binary content'
      fs.writeFileSync(filePath, content)

      const result = await readFileBinary(filePath)
      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.toString()).toBe(content)
    })
  })

  describe('readFileUtf8', () => {
    it('should read file as UTF-8 text', async () => {
      const filePath = path.join(tmpDir, 'text.txt')
      const content = 'UTF-8 content'
      fs.writeFileSync(filePath, content)

      const result = await readFileUtf8(filePath)
      expect(result).toBe(content)
    })
  })

  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      const filePath = path.join(tmpDir, 'data.json')
      const data = { name: 'test', value: 42 }
      fs.writeFileSync(filePath, JSON.stringify(data))

      const result = await readJson(filePath)
      expect(result).toEqual(data)
    })

    it('should handle encoding string parameter', async () => {
      const filePath = path.join(tmpDir, 'data.json')
      const data = { test: true }
      fs.writeFileSync(filePath, JSON.stringify(data))

      const result = await readJson(filePath, 'utf8')
      expect(result).toEqual(data)
    })

    it('should return undefined when throws is false and file not found', async () => {
      const result = await readJson(path.join(tmpDir, 'nonexistent.json'), {
        throws: false,
      })
      expect(result).toBeUndefined()
    })

    it('should throw when file not found and throws is true', async () => {
      await expect(
        readJson(path.join(tmpDir, 'nonexistent.json'), { throws: true }),
      ).rejects.toThrow()
    })

    it('should use reviver function', async () => {
      const filePath = path.join(tmpDir, 'data.json')
      fs.writeFileSync(filePath, JSON.stringify({ num: '42' }))

      const result = await readJson(filePath, {
        reviver: (key: string, value: any) =>
          key === 'num' ? parseInt(value, 10) : value,
      })
      expect((result as any).num).toBe(42)
    })
  })

  describe('readJsonSync', () => {
    it('should read and parse JSON file synchronously', () => {
      const filePath = path.join(tmpDir, 'data.json')
      const data = { name: 'test', value: 42 }
      fs.writeFileSync(filePath, JSON.stringify(data))

      const result = readJsonSync(filePath)
      expect(result).toEqual(data)
    })

    it('should return undefined when throws is false and file not found', () => {
      const result = readJsonSync(path.join(tmpDir, 'nonexistent.json'), {
        throws: false,
      })
      expect(result).toBeUndefined()
    })
  })

  describe('remove and removeSync', () => {
    it('should remove file asynchronously', async () => {
      const filePath = path.join(tmpDir, 'toremove.txt')
      fs.writeFileSync(filePath, 'content')

      await remove(filePath)
      expect(fs.existsSync(filePath)).toBe(false)
    })

    it('should remove file synchronously', () => {
      const filePath = path.join(tmpDir, 'toremove.txt')
      fs.writeFileSync(filePath, 'content')

      removeSync(filePath)
      expect(fs.existsSync(filePath)).toBe(false)
    })

    it('should remove directory recursively', async () => {
      const dirPath = path.join(tmpDir, 'toremove')
      fs.mkdirSync(dirPath)
      fs.writeFileSync(path.join(dirPath, 'file.txt'), 'content')

      await remove(dirPath)
      expect(fs.existsSync(dirPath)).toBe(false)
    })
  })

  describe('safeReadFile', () => {
    it('should read file safely', async () => {
      const filePath = path.join(tmpDir, 'safe.txt')
      const content = 'safe content'
      fs.writeFileSync(filePath, content)

      // @ts-expect-error - Testing runtime behavior with encoding string.
      const result = await safeReadFile(filePath, 'utf8')
      expect(result).toBe(content)
    })

    it('should return undefined for non-existent file', async () => {
      const result = await safeReadFile(
        path.join(tmpDir, 'nonexistent.txt'),
        // @ts-expect-error - Testing runtime behavior with encoding string.
        'utf8',
      )
      expect(result).toBeUndefined()
    })

    it('should handle encoding string parameter', async () => {
      const filePath = path.join(tmpDir, 'safe.txt')
      fs.writeFileSync(filePath, 'content')

      // @ts-expect-error - Testing runtime behavior with encoding string.
      const result = await safeReadFile(filePath, 'utf8')
      expect(typeof result).toBe('string')
    })
  })

  describe('safeReadFileSync', () => {
    it('should read file safely synchronously', () => {
      const filePath = path.join(tmpDir, 'safe.txt')
      const content = 'safe content'
      fs.writeFileSync(filePath, content)

      // @ts-expect-error - Testing runtime behavior with encoding string.
      const result = safeReadFileSync(filePath, 'utf8')
      expect(result).toBe(content)
    })

    it('should return undefined for non-existent file', () => {
      const result = safeReadFileSync(
        path.join(tmpDir, 'nonexistent.txt'),
        // @ts-expect-error - Testing runtime behavior with encoding string.
        'utf8',
      )
      expect(result).toBeUndefined()
    })
  })

  describe('safeStatsSync', () => {
    it('should get file stats safely', () => {
      const filePath = path.join(tmpDir, 'stats.txt')
      fs.writeFileSync(filePath, 'content')

      const result = safeStatsSync(filePath)
      expect(result).toBeDefined()
      expect(result?.isFile()).toBe(true)
    })

    it('should return undefined for non-existent file', () => {
      const result = safeStatsSync(path.join(tmpDir, 'nonexistent.txt'))
      expect(result).toBeUndefined()
    })
  })

  describe('uniqueSync', () => {
    it('should return original path when file does not exist', () => {
      const filePath = path.join(tmpDir, 'unique.txt')
      const result = uniqueSync(filePath)
      expect(result).toBe(filePath)
    })

    it('should generate unique path when file exists', () => {
      const filePath = path.join(tmpDir, 'existing.txt')
      fs.writeFileSync(filePath, 'content')

      const result = uniqueSync(filePath)
      expect(result).toMatch(/existing-\d+\.txt$/)
      expect(fs.existsSync(result)).toBe(false)
    })

    it('should handle files without extensions', () => {
      const filePath = path.join(tmpDir, 'noext')
      fs.writeFileSync(filePath, 'content')

      const result = uniqueSync(filePath)
      expect(result).toMatch(/noext-\d+$/)
    })
  })

  describe('writeJson and writeJsonSync', () => {
    it('should write JSON asynchronously', async () => {
      const filePath = path.join(tmpDir, 'output.json')
      const data = { name: 'test', value: 42 }

      await writeJson(filePath, data)
      const written = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      expect(written).toEqual(data)
    })

    it('should write JSON synchronously', () => {
      const filePath = path.join(tmpDir, 'output.json')
      const data = { name: 'test', value: 42 }

      writeJsonSync(filePath, data)
      const written = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      expect(written).toEqual(data)
    })

    it('should handle custom formatting options', async () => {
      const filePath = path.join(tmpDir, 'formatted.json')
      const data = { a: 1, b: 2 }

      await writeJson(filePath, data, {
        spaces: 4,
        EOL: '\r\n',
        finalEOL: false,
      })

      const content = fs.readFileSync(filePath, 'utf8')
      expect(content.includes('    ')).toBe(true)
      expect(content.includes('\r\n')).toBe(true)
      expect(content.endsWith('\r\n')).toBe(false)
    })

    it('should handle encoding string parameter', async () => {
      const filePath = path.join(tmpDir, 'encoded.json')
      const data = { test: 'utf8' }

      await writeJson(filePath, data, 'utf8')
      expect(fs.existsSync(filePath)).toBe(true)
    })

    it('should use replacer function', () => {
      const filePath = path.join(tmpDir, 'replaced.json')
      const data = { secret: 'hidden', public: 'visible' }

      writeJsonSync(filePath, data, {
        replacer: (key: string, value: any) =>
          key === 'secret' ? undefined : value,
      })

      const written = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      expect(written.secret).toBeUndefined()
      expect(written.public).toBe('visible')
    })
  })
})
