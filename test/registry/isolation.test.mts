import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { deleteAsync as del } from 'del'
import { afterEach, describe, expect, it } from 'vitest'

import { isolatePackage } from '../../registry/dist/lib/packages/isolation.js'

describe('isolation module', () => {
  const tmpDirs: string[] = []

  afterEach(async () => {
    for (const tmpDir of tmpDirs) {
      if (existsSync(tmpDir)) {
        // eslint-disable-next-line no-await-in-loop
        await del(tmpDir, { force: true })
      }
    }
    tmpDirs.length = 0
  })

  describe('isolatePackage', () => {
    it('should isolate a local package by path', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-src-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      await fs.writeFile(
        path.join(testPkgDir, 'index.js'),
        'module.exports = { value: 42 }',
      )

      const result = await isolatePackage(testPkgDir)
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(result.tmpdir).toBeDefined()
      expect(existsSync(result.tmpdir)).toBe(true)
      expect(existsSync(path.join(result.tmpdir, 'package.json'))).toBe(true)
      expect(existsSync(path.join(result.tmpdir, 'index.js'))).toBe(true)
    })

    it('should throw error for non-existent path', async () => {
      const nonExistentPath = path.join(os.tmpdir(), 'non-existent-package')

      await expect(isolatePackage(nonExistentPath)).rejects.toThrow(
        'Source path does not exist',
      )
    })

    it('should throw error for path without package.json', async () => {
      const testDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-nopkg-'),
      )
      tmpDirs.push(testDir)

      await expect(isolatePackage(testDir)).rejects.toThrow('ENOENT')
    })

    it('should support imports option', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-imports-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      await fs.writeFile(
        path.join(testPkgDir, 'module.js'),
        'module.exports = { test: true }',
      )

      const result = await isolatePackage(testPkgDir, {
        imports: { testModule: './module.js' },
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(result.exports).toBeDefined()
      expect(result.exports!['testModule']).toEqual({ test: true })
    })

    it('should support onPackageJson callback', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-callback-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
          description: 'original',
        }),
      )

      const result = await isolatePackage(testPkgDir, {
        onPackageJson: pkgJson => ({
          ...pkgJson,
          description: 'modified',
        }),
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      const pkgJsonPath = path.join(result.tmpdir, 'package.json')
      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))

      expect(pkgJson.description).toBe('modified')
    })

    it('should support async onPackageJson callback', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-async-callback-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(testPkgDir, {
        onPackageJson: async pkgJson => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return {
            ...pkgJson,
            custom: 'value',
          }
        },
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      const pkgJsonPath = path.join(result.tmpdir, 'package.json')
      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))

      expect(pkgJson.custom).toBe('value')
    })

    it('should handle scoped packages', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-scoped-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: '@scope/test-package',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(testPkgDir)
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(result.tmpdir).toContain('@scope')
      expect(existsSync(result.tmpdir)).toBe(true)
    })

    it('should filter out node_modules and .DS_Store', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-filter-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      const nodeModulesDir = path.join(testPkgDir, 'node_modules')
      await fs.mkdir(nodeModulesDir)
      await fs.writeFile(
        path.join(nodeModulesDir, 'should-not-copy.js'),
        'test',
      )

      await fs.writeFile(path.join(testPkgDir, '.DS_Store'), 'test')

      const result = await isolatePackage(testPkgDir)
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(
        existsSync(
          path.join(result.tmpdir, 'node_modules', 'should-not-copy.js'),
        ),
      ).toBe(false)
      expect(existsSync(path.join(result.tmpdir, '.DS_Store'))).toBe(false)
    })

    it('should support custom install function', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-install-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      let installCalled = false
      let installCwd = ''

      const result = await isolatePackage(testPkgDir, {
        install: async cwd => {
          installCalled = true
          installCwd = cwd
        },
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(installCalled).toBe(true)
      expect(installCwd).toBe(result.tmpdir)
    })

    it('should create unique temporary directories', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-unique-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      const result1 = await isolatePackage(testPkgDir, {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result1.tmpdir))

      const result2 = await isolatePackage(testPkgDir, {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result2.tmpdir))

      expect(result1.tmpdir).not.toBe(result2.tmpdir)
    })

    it('should sanitize package name for temp directory', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-sanitize-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: '@scope/test-package',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(testPkgDir, {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      // Result.tmpdir structure: /tmp/socket-test-{name}-XXXXXX/{name}/node_modules/@scope/test-package
      // Navigate up 4 levels to reach the temp directory with the sanitized name prefix.
      const tempParent = path.resolve(result.tmpdir, '../../../..')
      expect(path.basename(tempParent)).toMatch(
        /socket-test--scope-test-package-/,
      )
    })

    it('should throw when package name cannot be determined', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-noname-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          version: '1.0.0',
        }),
      )

      await expect(isolatePackage(testPkgDir)).rejects.toThrow(
        'Could not determine package name',
      )
    })

    it('should handle relative paths', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-relative-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(
        `./${path.relative(process.cwd(), testPkgDir)}`,
        {
          install: async () => {},
        },
      )
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(existsSync(result.tmpdir)).toBe(true)
    })

    it('should handle absolute paths', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-absolute-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(path.resolve(testPkgDir), {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(existsSync(result.tmpdir)).toBe(true)
    })

    it('should create nested directories for scoped packages', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-nested-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: '@myorg/mypackage',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(testPkgDir, {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(result.tmpdir).toContain(path.join('node_modules', '@myorg'))
      expect(existsSync(result.tmpdir)).toBe(true)
    })

    it('should preserve file contents', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-contents-'),
      )
      tmpDirs.push(testPkgDir)

      const testContent = 'console.log("test")'
      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )
      await fs.writeFile(path.join(testPkgDir, 'index.js'), testContent)

      const result = await isolatePackage(testPkgDir, {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      const copiedContent = await fs.readFile(
        path.join(result.tmpdir, 'index.js'),
        'utf8',
      )
      expect(copiedContent).toBe(testContent)
    })

    it('should handle empty source directory', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-empty-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(testPkgDir, {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(existsSync(result.tmpdir)).toBe(true)
      expect(existsSync(path.join(result.tmpdir, 'package.json'))).toBe(true)
    })

    it('should handle non-scoped package names', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-unscoped-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'unscoped-package',
          version: '1.0.0',
        }),
      )

      await fs.writeFile(
        path.join(testPkgDir, 'index.js'),
        'module.exports = { test: true }',
      )

      const result = await isolatePackage(testPkgDir, {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(result.tmpdir).toContain('unscoped-package')
      expect(existsSync(result.tmpdir)).toBe(true)
      expect(existsSync(path.join(result.tmpdir, 'index.js'))).toBe(true)
    })

    it('should run default pnpm install when no custom install provided', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-pnpm-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(testPkgDir)
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(existsSync(result.tmpdir)).toBe(true)
      expect(existsSync(path.join(result.tmpdir, 'package.json'))).toBe(true)
    })
  })

  describe('npm package specs', () => {
    it('should handle package name with version spec', async () => {
      const result = await isolatePackage('is-odd@3.0.1', {
        install: async cwd => {
          const nodeModulesPath = path.join(cwd, 'node_modules', 'is-odd')
          await fs.mkdir(nodeModulesPath, { recursive: true })
          await fs.writeFile(
            path.join(nodeModulesPath, 'package.json'),
            JSON.stringify({
              name: 'is-odd',
              version: '3.0.1',
            }),
          )
        },
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(result.tmpdir).toContain('is-odd')
      expect(existsSync(result.tmpdir)).toBe(true)
      expect(existsSync(path.join(result.tmpdir, 'package.json'))).toBe(true)
    })

    it('should handle scoped package with version', async () => {
      const result = await isolatePackage('@socketregistry/scripts@1.0.0', {
        install: async cwd => {
          const nodeModulesPath = path.join(
            cwd,
            'node_modules',
            '@socketregistry',
            'scripts',
          )
          await fs.mkdir(nodeModulesPath, { recursive: true })
          await fs.writeFile(
            path.join(nodeModulesPath, 'package.json'),
            JSON.stringify({
              name: '@socketregistry/scripts',
              version: '1.0.0',
            }),
          )
        },
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(result.tmpdir).toContain('@socketregistry')
      expect(existsSync(result.tmpdir)).toBe(true)
    })

    it('should handle npm-package-arg directory type', async () => {
      const testPkgDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'socket-test-npa-dir-'),
      )
      tmpDirs.push(testPkgDir)

      await fs.writeFile(
        path.join(testPkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        }),
      )

      const result = await isolatePackage(`file:${testPkgDir}`, {
        install: async () => {},
      })
      tmpDirs.push(path.dirname(result.tmpdir))

      expect(existsSync(result.tmpdir)).toBe(true)
    })

    it('should throw for non-existent directory in npm-package-arg', async () => {
      await expect(isolatePackage('file:/non-existent-path')).rejects.toThrow(
        'Source path does not exist',
      )
    })
  })

  describe('error handling', () => {
    it('should throw when sourcePath required but not provided', async () => {
      await expect(
        isolatePackage('package-without-version-spec'),
      ).rejects.toThrow()
    })

    it('should throw for non-existent path', async () => {
      await expect(isolatePackage('/path/that/does/not/exist')).rejects.toThrow(
        'Source path does not exist',
      )
    })
  })
})
