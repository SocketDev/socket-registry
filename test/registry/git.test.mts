import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  getChangedFiles,
  getChangedFilesSync,
  getStagedFiles,
  getStagedFilesSync,
  getUnstagedFiles,
  getUnstagedFilesSync,
  isChanged,
  isChangedSync,
  isStaged,
  isStagedSync,
  isUnstaged,
  isUnstagedSync,
} from '../../registry/dist/lib/git.js'
import { spawn } from '../../registry/dist/lib/spawn.js'

describe('git utilities', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    originalCwd = process.cwd()
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'socket-git-test-'))
    process.chdir(tmpDir)

    // Initialize git repo.
    await spawn('git', ['init'])
    await spawn('git', ['config', 'user.email', 'test@example.com'])
    await spawn('git', ['config', 'user.name', 'Test User'])

    // Create initial commit.
    await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'initial content')
    await spawn('git', ['add', '.'])
    await spawn('git', ['commit', '-m', 'Initial commit'])
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    if (existsSync(tmpDir)) {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  describe('getChangedFiles', () => {
    it('should return empty array when no changes', async () => {
      const files = await getChangedFiles()
      expect(files).toEqual([])
    })

    it('should detect unstaged changes', async () => {
      await fs.writeFile(path.join(tmpDir, 'modified.txt'), 'modified')
      const files = await getChangedFiles()
      expect(files).toContain('modified.txt')
    })

    it('should detect staged changes', async () => {
      await fs.writeFile(path.join(tmpDir, 'staged.txt'), 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const files = await getChangedFiles()
      expect(files).toContain('staged.txt')
    })

    it('should detect untracked files', async () => {
      await fs.writeFile(path.join(tmpDir, 'untracked.txt'), 'untracked')
      const files = await getChangedFiles()
      expect(files).toContain('untracked.txt')
    })

    it('should detect all types of changes together', async () => {
      await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'modified')
      await fs.writeFile(path.join(tmpDir, 'staged.txt'), 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      await fs.writeFile(path.join(tmpDir, 'untracked.txt'), 'untracked')

      const files = await getChangedFiles()
      expect(files).toContain('initial.txt')
      expect(files).toContain('staged.txt')
      expect(files).toContain('untracked.txt')
    })
  })

  describe('getChangedFilesSync', () => {
    it('should return empty array when no changes', () => {
      const files = getChangedFilesSync()
      expect(files).toEqual([])
    })

    it('should detect unstaged changes', async () => {
      await fs.writeFile(path.join(tmpDir, 'modified.txt'), 'modified')
      const files = getChangedFilesSync()
      expect(files).toContain('modified.txt')
    })

    it('should detect staged changes', async () => {
      await fs.writeFile(path.join(tmpDir, 'staged.txt'), 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const files = getChangedFilesSync()
      expect(files).toContain('staged.txt')
    })

    it('should detect untracked files', async () => {
      await fs.writeFile(path.join(tmpDir, 'untracked.txt'), 'untracked')
      const files = getChangedFilesSync()
      expect(files).toContain('untracked.txt')
    })
  })

  describe('getUnstagedFiles', () => {
    it('should return empty array when no unstaged changes', async () => {
      const files = await getUnstagedFiles()
      expect(files).toEqual([])
    })

    it('should detect modified unstaged files', async () => {
      await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'modified content')
      const files = await getUnstagedFiles()
      expect(files).toContain('initial.txt')
    })

    it('should not include staged changes', async () => {
      await fs.writeFile(path.join(tmpDir, 'staged.txt'), 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const files = await getUnstagedFiles()
      expect(files).not.toContain('staged.txt')
    })

    it('should not include untracked files', async () => {
      await fs.writeFile(path.join(tmpDir, 'untracked.txt'), 'untracked')
      const files = await getUnstagedFiles()
      expect(files).not.toContain('untracked.txt')
    })
  })

  describe('getUnstagedFilesSync', () => {
    it('should return empty array when no unstaged changes', () => {
      const files = getUnstagedFilesSync()
      expect(files).toEqual([])
    })

    it('should detect modified unstaged files', async () => {
      await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'modified content')
      const files = getUnstagedFilesSync()
      expect(files).toContain('initial.txt')
    })

    it('should not include staged changes', async () => {
      await fs.writeFile(path.join(tmpDir, 'staged.txt'), 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const files = getUnstagedFilesSync()
      expect(files).not.toContain('staged.txt')
    })
  })

  describe('getStagedFiles', () => {
    it('should return empty array when no staged changes', async () => {
      const files = await getStagedFiles()
      expect(files).toEqual([])
    })

    it('should detect staged files', async () => {
      await fs.writeFile(path.join(tmpDir, 'staged.txt'), 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const files = await getStagedFiles()
      expect(files).toContain('staged.txt')
    })

    it('should not include unstaged changes', async () => {
      await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'modified content')
      const files = await getStagedFiles()
      expect(files).not.toContain('initial.txt')
    })

    it('should not include untracked files', async () => {
      await fs.writeFile(path.join(tmpDir, 'untracked.txt'), 'untracked')
      const files = await getStagedFiles()
      expect(files).not.toContain('untracked.txt')
    })
  })

  describe('getStagedFilesSync', () => {
    it('should return empty array when no staged changes', () => {
      const files = getStagedFilesSync()
      expect(files).toEqual([])
    })

    it('should detect staged files', async () => {
      await fs.writeFile(path.join(tmpDir, 'staged.txt'), 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const files = getStagedFilesSync()
      expect(files).toContain('staged.txt')
    })

    it('should not include unstaged changes', async () => {
      await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'modified content')
      const files = getStagedFilesSync()
      expect(files).not.toContain('initial.txt')
    })
  })

  describe('isChanged', () => {
    it('should return false for unchanged file', async () => {
      const result = await isChanged(path.join(tmpDir, 'initial.txt'))
      expect(result).toBe(false)
    })

    it('should return true for unstaged modified file', async () => {
      const filepath = path.join(tmpDir, 'initial.txt')
      await fs.writeFile(filepath, 'modified content')
      const result = await isChanged(filepath)
      expect(result).toBe(true)
    })

    it('should return true for staged file', async () => {
      const filepath = path.join(tmpDir, 'staged.txt')
      await fs.writeFile(filepath, 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const result = await isChanged(filepath)
      expect(result).toBe(true)
    })

    it('should return true for untracked file', async () => {
      const filepath = path.join(tmpDir, 'untracked.txt')
      await fs.writeFile(filepath, 'untracked')
      const result = await isChanged(filepath)
      expect(result).toBe(true)
    })
  })

  describe('isChangedSync', () => {
    it('should return false for unchanged file', () => {
      const result = isChangedSync(path.join(tmpDir, 'initial.txt'))
      expect(result).toBe(false)
    })

    it('should return true for unstaged modified file', async () => {
      const filepath = path.join(tmpDir, 'initial.txt')
      await fs.writeFile(filepath, 'modified content')
      const result = isChangedSync(filepath)
      expect(result).toBe(true)
    })

    it('should return true for staged file', async () => {
      const filepath = path.join(tmpDir, 'staged.txt')
      await fs.writeFile(filepath, 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const result = isChangedSync(filepath)
      expect(result).toBe(true)
    })

    it('should return true for untracked file', async () => {
      const filepath = path.join(tmpDir, 'untracked.txt')
      await fs.writeFile(filepath, 'untracked')
      const result = isChangedSync(filepath)
      expect(result).toBe(true)
    })
  })

  describe('isUnstaged', () => {
    it('should return false for unchanged file', async () => {
      const result = await isUnstaged(path.join(tmpDir, 'initial.txt'))
      expect(result).toBe(false)
    })

    it('should return true for unstaged modified file', async () => {
      const filepath = path.join(tmpDir, 'initial.txt')
      await fs.writeFile(filepath, 'modified content')
      const result = await isUnstaged(filepath)
      expect(result).toBe(true)
    })

    it('should return false for staged file', async () => {
      const filepath = path.join(tmpDir, 'staged.txt')
      await fs.writeFile(filepath, 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const result = await isUnstaged(filepath)
      expect(result).toBe(false)
    })

    it('should return false for untracked file', async () => {
      const filepath = path.join(tmpDir, 'untracked.txt')
      await fs.writeFile(filepath, 'untracked')
      const result = await isUnstaged(filepath)
      expect(result).toBe(false)
    })
  })

  describe('isUnstagedSync', () => {
    it('should return false for unchanged file', () => {
      const result = isUnstagedSync(path.join(tmpDir, 'initial.txt'))
      expect(result).toBe(false)
    })

    it('should return true for unstaged modified file', async () => {
      const filepath = path.join(tmpDir, 'initial.txt')
      await fs.writeFile(filepath, 'modified content')
      const result = isUnstagedSync(filepath)
      expect(result).toBe(true)
    })

    it('should return false for staged file', async () => {
      const filepath = path.join(tmpDir, 'staged.txt')
      await fs.writeFile(filepath, 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const result = isUnstagedSync(filepath)
      expect(result).toBe(false)
    })

    it('should return false for untracked file', async () => {
      const filepath = path.join(tmpDir, 'untracked.txt')
      await fs.writeFile(filepath, 'untracked')
      const result = isUnstagedSync(filepath)
      expect(result).toBe(false)
    })
  })

  describe('isStaged', () => {
    it('should return false for unchanged file', async () => {
      const result = await isStaged(path.join(tmpDir, 'initial.txt'))
      expect(result).toBe(false)
    })

    it('should return false for unstaged modified file', async () => {
      const filepath = path.join(tmpDir, 'initial.txt')
      await fs.writeFile(filepath, 'modified content')
      const result = await isStaged(filepath)
      expect(result).toBe(false)
    })

    it('should return true for staged file', async () => {
      const filepath = path.join(tmpDir, 'staged.txt')
      await fs.writeFile(filepath, 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const result = await isStaged(filepath)
      expect(result).toBe(true)
    })

    it('should return false for untracked file', async () => {
      const filepath = path.join(tmpDir, 'untracked.txt')
      await fs.writeFile(filepath, 'untracked')
      const result = await isStaged(filepath)
      expect(result).toBe(false)
    })
  })

  describe('isStagedSync', () => {
    it('should return false for unchanged file', () => {
      const result = isStagedSync(path.join(tmpDir, 'initial.txt'))
      expect(result).toBe(false)
    })

    it('should return false for unstaged modified file', async () => {
      const filepath = path.join(tmpDir, 'initial.txt')
      await fs.writeFile(filepath, 'modified content')
      const result = isStagedSync(filepath)
      expect(result).toBe(false)
    })

    it('should return true for staged file', async () => {
      const filepath = path.join(tmpDir, 'staged.txt')
      await fs.writeFile(filepath, 'staged content')
      await spawn('git', ['add', 'staged.txt'])
      const result = isStagedSync(filepath)
      expect(result).toBe(true)
    })

    it('should return false for untracked file', async () => {
      const filepath = path.join(tmpDir, 'untracked.txt')
      await fs.writeFile(filepath, 'untracked')
      const result = isStagedSync(filepath)
      expect(result).toBe(false)
    })
  })

  describe('caching', () => {
    it('should cache results by default', async () => {
      await fs.writeFile(path.join(tmpDir, 'cached.txt'), 'content')
      await spawn('git', ['add', 'cached.txt'])

      const files1 = await getStagedFiles()
      const files2 = await getStagedFiles()

      expect(files1).toEqual(files2)
      expect(files1).toContain('cached.txt')
    })

    it('should respect cache option', async () => {
      await fs.writeFile(path.join(tmpDir, 'nocache.txt'), 'content')
      await spawn('git', ['add', 'nocache.txt'])

      const files1 = await getStagedFiles({ cache: false })
      const files2 = await getStagedFiles({ cache: false })

      expect(files1).toEqual(files2)
      expect(files1).toContain('nocache.txt')
    })
  })

  describe('cwd option', () => {
    it('should filter files by cwd option', async () => {
      const subdir = path.join(tmpDir, 'subdir')
      await fs.mkdir(subdir)
      await fs.writeFile(path.join(subdir, 'file.txt'), 'content')
      await fs.writeFile(path.join(tmpDir, 'root.txt'), 'content')
      await spawn('git', ['add', '.'])

      const files = await getStagedFiles({ cwd: subdir })
      expect(files).toContain('subdir/file.txt')
      expect(files).not.toContain('root.txt')
    })
  })
})
