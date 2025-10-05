/** @fileoverview Test that all built files are properly exported in package.json. */

import { existsSync } from 'node:fs'
import path from 'node:path'

import fastGlob from 'fast-glob'
import { describe, expect, it } from 'vitest'

import { readPackageJson } from '../../registry/dist/lib/packages.js'

const registryPkgPath = path.resolve(import.meta.dirname, '../../registry')

describe('package.json exports validation', () => {
  it('should have exports for all dist files listed in "files" field', async () => {
    const pkgJson = await readPackageJson(registryPkgPath)

    expect(pkgJson).toBeDefined()
    expect(pkgJson?.exports).toBeDefined()
    expect(pkgJson?.['files']).toBeDefined()

    const exports = pkgJson?.exports
    const files = pkgJson?.['files']

    if (!exports || typeof exports !== 'object' || Array.isArray(exports)) {
      throw new Error('exports should be an object')
    }

    if (!Array.isArray(files)) {
      throw new Error('files should be an array')
    }

    const exportPaths = new Set<string>()

    const extractFilePaths = (value: any): void => {
      if (typeof value === 'string') {
        if (value.startsWith('./')) {
          exportPaths.add(value.slice(2))
        }
      } else if (value && typeof value === 'object') {
        for (const v of Object.values(value)) {
          extractFilePaths(v)
        }
      }
    }

    for (const value of Object.values(exports)) {
      extractFilePaths(value)
    }

    const distPatterns = files.filter(pattern => pattern.startsWith('dist/'))
    expect(distPatterns.length).toBeGreaterThan(0)

    const actualDistFiles = await fastGlob.glob(distPatterns, {
      cwd: registryPkgPath,
      ignore: ['**/*.map', '**/node_modules/**', '**/dist/external/**'],
    })

    expect(actualDistFiles.length).toBeGreaterThan(0)

    const missingFromExports: string[] = []

    for (const file of actualDistFiles) {
      if (
        file.endsWith('.js') ||
        file.endsWith('.d.ts') ||
        file.endsWith('.cjs')
      ) {
        if (!exportPaths.has(file)) {
          missingFromExports.push(file)
        }
      }
    }

    expect(
      missingFromExports,
      `All files matching "files" patterns should be in exports. Missing: ${missingFromExports.slice(0, 10).join(', ')}${missingFromExports.length > 10 ? ` and ${missingFromExports.length - 10} more` : ''}`,
    ).toEqual([])

    for (const file of Array.from(exportPaths)) {
      const fullPath = path.join(registryPkgPath, file)
      expect(
        existsSync(fullPath),
        `Export path "${file}" should exist at ${fullPath}`,
      ).toBe(true)
    }
  })

  it('should export ./lib/dependencies', async () => {
    const pkgJson = await readPackageJson(registryPkgPath)

    expect(pkgJson?.exports).toBeDefined()

    const exports = pkgJson?.exports
    if (!exports || typeof exports !== 'object' || Array.isArray(exports)) {
      throw new Error('exports should be an object')
    }

    const dependenciesExport = exports['./lib/dependencies']
    expect(dependenciesExport).toBeDefined()
    expect(dependenciesExport).toMatchObject({
      types: './dist/lib/dependencies/index.d.ts',
      default: './dist/lib/dependencies/index.js',
    })

    const typesPath = path.join(
      registryPkgPath,
      'dist/lib/dependencies/index.d.ts',
    )
    const jsPath = path.join(registryPkgPath, 'dist/lib/dependencies/index.js')

    expect(
      existsSync(typesPath),
      `Types file should exist at ${typesPath}`,
    ).toBe(true)
    expect(existsSync(jsPath), `JS file should exist at ${jsPath}`).toBe(true)
  })

  it('should have all dependencies submodules exported', async () => {
    const pkgJson = await readPackageJson(registryPkgPath)
    const exports = pkgJson?.exports

    if (!exports || typeof exports !== 'object' || Array.isArray(exports)) {
      throw new Error('exports should be an object')
    }

    const dependenciesSubmodules = [
      './lib/dependencies',
      './lib/dependencies/build-tools',
      './lib/dependencies/file-system',
      './lib/dependencies/index',
      './lib/dependencies/logging',
      './lib/dependencies/npm-tools',
      './lib/dependencies/prompts',
      './lib/dependencies/system',
      './lib/dependencies/validation',
    ]

    for (const submodule of dependenciesSubmodules) {
      expect(
        exports[submodule],
        `Export "${submodule}" should be defined`,
      ).toBeDefined()

      const exportValue = exports[submodule]
      expect(exportValue).toHaveProperty('types')
      expect(exportValue).toHaveProperty('default')

      if (
        typeof exportValue === 'object' &&
        exportValue !== null &&
        'types' in exportValue &&
        'default' in exportValue &&
        typeof exportValue.types === 'string' &&
        typeof exportValue.default === 'string'
      ) {
        const typesPath = path.join(registryPkgPath, exportValue.types.slice(2))
        const defaultPath = path.join(
          registryPkgPath,
          exportValue.default.slice(2),
        )

        expect(
          existsSync(typesPath),
          `Types file for "${submodule}" should exist at ${typesPath}`,
        ).toBe(true)
        expect(
          existsSync(defaultPath),
          `Default file for "${submodule}" should exist at ${defaultPath}`,
        ).toBe(true)
      }
    }
  })

  it('should not have exports pointing to non-existent files', async () => {
    const pkgJson = await readPackageJson(registryPkgPath)
    const exports = pkgJson?.exports

    if (!exports || typeof exports !== 'object' || Array.isArray(exports)) {
      throw new Error('exports should be an object')
    }

    const missingFiles: string[] = []

    const checkFilePath = (filePath: string): void => {
      if (typeof filePath === 'string' && filePath.startsWith('./')) {
        const fullPath = path.join(registryPkgPath, filePath.slice(2))
        if (!existsSync(fullPath)) {
          missingFiles.push(filePath)
        }
      }
    }

    const traverseExports = (value: any): void => {
      if (typeof value === 'string') {
        checkFilePath(value)
      } else if (value && typeof value === 'object') {
        for (const v of Object.values(value)) {
          traverseExports(v)
        }
      }
    }

    for (const value of Object.values(exports)) {
      traverseExports(value)
    }

    expect(
      missingFiles,
      `All exported files should exist. Missing: ${missingFiles.join(', ')}`,
    ).toEqual([])
  })

  it('should have types field for all code exports', async () => {
    const pkgJson = await readPackageJson(registryPkgPath)
    const exports = pkgJson?.exports

    if (!exports || typeof exports !== 'object' || Array.isArray(exports)) {
      throw new Error('exports should be an object')
    }

    const exportsWithoutTypes: string[] = []

    for (const { 0: key, 1: value } of Object.entries(exports)) {
      if (key.endsWith('.json')) {
        continue
      }

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        if (!('types' in value)) {
          exportsWithoutTypes.push(key)
        }
      }
    }

    expect(
      exportsWithoutTypes,
      `All code exports should have types field. Missing: ${exportsWithoutTypes.join(', ')}`,
    ).toEqual([])
  })
})
