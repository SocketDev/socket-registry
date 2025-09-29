import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const {
  isBlessedPackageName,
  normalizePackageJson,
  readPackageJson,
  readPackageJsonSync,
  resolveOriginalPackageName,
  resolvePackageJsonPath,
} = require('../../registry/dist/lib/packages')

describe('packages normalization and reading', () => {
  describe('normalizePackageJson', () => {
    it('should normalize package.json object', () => {
      const pkg = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          lodash: '^4.17.0',
        },
      }
      const normalized = normalizePackageJson(pkg)
      expect(normalized).toBeDefined()
      expect(normalized.name).toBe('test-package')
    })

    it('should handle minimal package.json', () => {
      const pkg = { name: 'test' }
      const normalized = normalizePackageJson(pkg)
      expect(normalized).toBeDefined()
      expect(normalized.name).toBe('test')
    })

    it('should handle empty object', () => {
      const normalized = normalizePackageJson({})
      expect(normalized).toBeDefined()
    })

    it('should normalize scripts', () => {
      const pkg = {
        name: 'test',
        scripts: {
          test: 'echo "test"',
          build: 'npm run compile',
        },
      }
      const normalized = normalizePackageJson(pkg)
      expect(normalized.scripts).toBeDefined()
    })
  })

  describe('readPackageJson', () => {
    it('should read package.json file', async () => {
      const tmpDir = path.join(os.tmpdir(), `test-${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })
      const pkg = { name: 'test', version: '1.0.0' }
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

      try {
        const result = await readPackageJson(tmpDir)
        expect(result.name).toBe('test')
        expect(result.version).toBe('1.0.0')
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should handle options', async () => {
      const tmpDir = path.join(os.tmpdir(), `test-${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })
      const pkg = { name: 'test', scripts: { test: 'jest' } }
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

      try {
        const result = await readPackageJson(tmpDir, { normalize: true })
        expect(result.name).toBe('test')
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })

  describe('readPackageJsonSync', () => {
    it('should read package.json file synchronously', () => {
      const tmpDir = path.join(os.tmpdir(), `test-${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })
      const pkg = { name: 'test', version: '1.0.0' }
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

      try {
        const result = readPackageJsonSync(tmpDir)
        expect(result.name).toBe('test')
        expect(result.version).toBe('1.0.0')
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should handle options', () => {
      const tmpDir = path.join(os.tmpdir(), `test-${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })
      const pkg = { name: 'test', scripts: { test: 'jest' } }
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

      try {
        const result = readPackageJsonSync(tmpDir, { normalize: true })
        expect(result.name).toBe('test')
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })

  describe('resolvePackageJsonPath', () => {
    it('should resolve package.json path', () => {
      const tmpDir = path.join(os.tmpdir(), `test-${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })
      const pkgPath = path.join(tmpDir, 'package.json')
      fs.writeFileSync(pkgPath, '{}')

      try {
        const resolvedPath = resolvePackageJsonPath(tmpDir)
        expect(resolvedPath).toBe(pkgPath)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('should handle file path input', () => {
      const tmpDir = path.join(os.tmpdir(), `test-${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })
      const pkgPath = path.join(tmpDir, 'package.json')
      fs.writeFileSync(pkgPath, '{}')

      try {
        const resolvedPath = resolvePackageJsonPath(pkgPath)
        expect(resolvedPath).toBe(pkgPath)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })

  describe('resolveOriginalPackageName', () => {
    it('should resolve original package name from registry name', () => {
      expect(resolveOriginalPackageName('@socketregistry/lodash')).toBe(
        'lodash',
      )
      expect(resolveOriginalPackageName('@socketregistry/babel__core')).toBe(
        '@babel/core',
      )
    })

    it('should handle non-registry packages', () => {
      expect(resolveOriginalPackageName('lodash')).toBe('lodash')
      expect(resolveOriginalPackageName('@babel/core')).toBe('@babel/core')
    })

    it('should handle empty string', () => {
      expect(resolveOriginalPackageName('')).toBe('')
    })
  })

  describe('isBlessedPackageName', () => {
    it('should reject non-blessed packages', () => {
      expect(isBlessedPackageName('lodash')).toBe(false)
      expect(isBlessedPackageName('express')).toBe(false)
      expect(isBlessedPackageName('random-package')).toBe(false)
    })

    it('should handle invalid input', () => {
      expect(isBlessedPackageName('')).toBe(false)
      expect(isBlessedPackageName(null)).toBe(false)
      expect(isBlessedPackageName(undefined)).toBe(false)
    })
  })
})
