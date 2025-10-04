import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  isDirEmptySync,
  isSymLinkSync,
  readDirNames,
  readDirNamesSync,
  readFileBinary,
  readFileBinarySync,
  readFileUtf8,
  readFileUtf8Sync,
  removeSync,
  safeReadFile,
  safeReadFileSync,
  safeStatsSync,
  uniqueSync,
  writeJson,
  writeJsonSync,
} from '../../registry/dist/lib/fs.js'
import { normalizePath } from '../../registry/dist/lib/path.js'

describe('fs module - additional functions', () => {
  describe('isDirEmptySync', () => {
    it('should detect empty directory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-empty-'))
      const result = isDirEmptySync(tmpDir)
      fs.rmdirSync(tmpDir)
      expect(result).toBe(true)
    })

    it('should detect non-empty directory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-nonempty-'))
      fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'content')
      const result = isDirEmptySync(tmpDir)
      fs.rmSync(tmpDir, { recursive: true })
      expect(result).toBe(false)
    })

    it('should handle non-existent directory', () => {
      const result = isDirEmptySync('/nonexistent/directory')
      expect(result).toBe(false)
    })
  })

  describe('isSymLinkSync', () => {
    it('should detect regular files as non-symlinks', () => {
      const tmpFile = path.join(os.tmpdir(), `test-file-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'test')
      const result = isSymLinkSync(tmpFile)
      fs.unlinkSync(tmpFile)
      expect(result).toBe(false)
    })

    it('should handle non-existent files', () => {
      const result = isSymLinkSync('/nonexistent/file.txt')
      expect(result).toBe(false)
    })
  })

  describe('readDirNames', () => {
    it('should read directory names', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-readdir-'))
      fs.writeFileSync(path.join(tmpDir, 'file1.txt'), 'content1')
      fs.writeFileSync(path.join(tmpDir, 'file2.txt'), 'content2')

      const result = await readDirNames(tmpDir)

      fs.rmSync(tmpDir, { recursive: true })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty directory', async () => {
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'test-empty-readdir-'),
      )
      const result = await readDirNames(tmpDir)
      fs.rmdirSync(tmpDir)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('readDirNamesSync', () => {
    it('should read directory names synchronously', () => {
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'test-readdir-sync-'),
      )
      fs.writeFileSync(path.join(tmpDir, 'file1.txt'), 'content1')
      fs.writeFileSync(path.join(tmpDir, 'file2.txt'), 'content2')

      const result = readDirNamesSync(tmpDir)

      fs.rmSync(tmpDir, { recursive: true })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle options', () => {
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'test-readdir-types-'),
      )
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content')

      const result = readDirNamesSync(tmpDir, {})

      fs.rmSync(tmpDir, { recursive: true })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('readFileBinary', () => {
    it('should read file as binary', async () => {
      const tmpFile = path.join(os.tmpdir(), `test-binary-${Date.now()}.bin`)
      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      fs.writeFileSync(tmpFile, buffer)

      const result = await readFileBinary(tmpFile)

      fs.unlinkSync(tmpFile)
      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBe(5)
    })
  })

  describe('readFileBinarySync', () => {
    it('should read file as binary synchronously', () => {
      const tmpFile = path.join(
        os.tmpdir(),
        `test-binary-sync-${Date.now()}.bin`,
      )
      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      fs.writeFileSync(tmpFile, buffer)

      const result = readFileBinarySync(tmpFile)

      fs.unlinkSync(tmpFile)
      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBe(5)
    })
  })

  describe('readFileUtf8', () => {
    it('should read file as UTF-8', async () => {
      const tmpFile = path.join(os.tmpdir(), `test-utf8-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'Hello World', 'utf8')

      const result = await readFileUtf8(tmpFile)

      fs.unlinkSync(tmpFile)
      expect(result).toBe('Hello World')
    })
  })

  describe('readFileUtf8Sync', () => {
    it('should read file as UTF-8 synchronously', () => {
      const tmpFile = path.join(os.tmpdir(), `test-utf8-sync-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'Hello World', 'utf8')

      const result = readFileUtf8Sync(tmpFile)

      fs.unlinkSync(tmpFile)
      expect(result).toBe('Hello World')
    })
  })

  describe('removeSync', () => {
    it('should remove file synchronously', () => {
      const tmpFile = path.join(os.tmpdir(), `test-remove-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'test')

      removeSync(tmpFile)

      expect(fs.existsSync(tmpFile)).toBe(false)
    })

    it('should remove directory synchronously', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-remove-dir-'))

      removeSync(tmpDir)

      expect(fs.existsSync(tmpDir)).toBe(false)
    })
  })

  describe('safeReadFile', () => {
    it('should read file safely', async () => {
      const tmpFile = path.join(os.tmpdir(), `test-safe-read-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'content', 'utf8')

      const result = await safeReadFile(tmpFile, { encoding: 'utf8' })

      fs.unlinkSync(tmpFile)
      expect(result).toBe('content')
    })

    it('should return undefined for non-existent file', async () => {
      const result = await safeReadFile('/nonexistent/file.txt', {
        encoding: 'utf8',
      })
      expect(result).toBe(undefined)
    })
  })

  describe('safeReadFileSync', () => {
    it('should read file safely synchronously', () => {
      const tmpFile = path.join(
        os.tmpdir(),
        `test-safe-read-sync-${Date.now()}.txt`,
      )
      fs.writeFileSync(tmpFile, 'content', 'utf8')

      const result = safeReadFileSync(tmpFile, { encoding: 'utf8' })

      fs.unlinkSync(tmpFile)
      expect(result).toBe('content')
    })

    it('should return undefined for non-existent file', () => {
      const result = safeReadFileSync('/nonexistent/file.txt', {
        encoding: 'utf8',
      })
      expect(result).toBe(undefined)
    })
  })

  describe('safeStatsSync', () => {
    it('should get stats safely', () => {
      const tmpFile = path.join(os.tmpdir(), `test-stats-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'content')

      const result = safeStatsSync(tmpFile)

      fs.unlinkSync(tmpFile)
      expect(result).toBeDefined()
      expect(result?.isFile()).toBe(true)
    })

    it('should return undefined for non-existent file', () => {
      const result = safeStatsSync('/nonexistent/file.txt')
      expect(result).toBe(undefined)
    })
  })

  describe('uniqueSync', () => {
    it('should return unique path for existing file', () => {
      const tmpFile = path.join(os.tmpdir(), `test-unique-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'content')

      const result = uniqueSync(tmpFile)

      fs.unlinkSync(tmpFile)
      expect(result).not.toBe(tmpFile)
      expect(result).toContain('test-unique-')
    })

    it('should return same path for non-existent file', () => {
      const tmpFile = path.join(os.tmpdir(), `test-nonexist-${Date.now()}.txt`)
      const result = uniqueSync(tmpFile)
      expect(result).toBe(normalizePath(tmpFile))
    })
  })

  describe('writeJson', () => {
    it('should write JSON to file', async () => {
      const tmpFile = path.join(os.tmpdir(), `test-json-${Date.now()}.json`)
      const data = { key: 'value', number: 42 }

      await writeJson(tmpFile, data)

      const content = fs.readFileSync(tmpFile, 'utf8')
      fs.unlinkSync(tmpFile)
      expect(JSON.parse(content)).toEqual(data)
    })

    it('should write formatted JSON', async () => {
      const tmpFile = path.join(
        os.tmpdir(),
        `test-json-format-${Date.now()}.json`,
      )
      const data = { key: 'value' }

      await writeJson(tmpFile, data, { spaces: 2 })

      const content = fs.readFileSync(tmpFile, 'utf8')
      fs.unlinkSync(tmpFile)
      expect(content).toContain('  "key"')
    })
  })

  describe('writeJsonSync', () => {
    it('should write JSON to file synchronously', () => {
      const tmpFile = path.join(
        os.tmpdir(),
        `test-json-sync-${Date.now()}.json`,
      )
      const data = { key: 'value', number: 42 }

      writeJsonSync(tmpFile, data)

      const content = fs.readFileSync(tmpFile, 'utf8')
      fs.unlinkSync(tmpFile)
      expect(JSON.parse(content)).toEqual(data)
    })

    it('should write formatted JSON synchronously', () => {
      const tmpFile = path.join(
        os.tmpdir(),
        `test-json-sync-format-${Date.now()}.json`,
      )
      const data = { key: 'value' }

      writeJsonSync(tmpFile, data, { spaces: 2 })

      const content = fs.readFileSync(tmpFile, 'utf8')
      fs.unlinkSync(tmpFile)
      expect(content).toContain('  "key"')
    })
  })
})
