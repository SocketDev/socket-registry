/**
 * @fileoverview Package isolation utilities for testing.
 * Provides tools to set up isolated test environments for packages.
 */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import WIN32 from '../constants/WIN32'
import { isPath } from '../path'
import { readPackageJson } from './operations'

import type { PackageJson } from '../packages'

/**
 * Copy options for fs.cp with cross-platform retry support.
 */
const FS_CP_OPTIONS = {
  dereference: true,
  errorOnExist: false,
  filter: (src: string) =>
    !src.includes('node_modules') && !src.endsWith('.DS_Store'),
  force: true,
  recursive: true,
  ...(WIN32 ? { maxRetries: 3, retryDelay: 100 } : {}),
}

/**
 * Resolve a path to its real location, handling symlinks.
 */
async function resolveRealPath(pathStr: string): Promise<string> {
  return await fs.realpath(pathStr).catch(() => path.resolve(pathStr))
}

/**
 * Merge and write package.json with original and new values.
 */
async function mergePackageJson(
  pkgJsonPath: string,
  originalPkgJson: PackageJson | undefined,
): Promise<PackageJson> {
  const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))
  const mergedPkgJson = originalPkgJson
    ? { ...originalPkgJson, ...pkgJson }
    : pkgJson
  return mergedPkgJson
}

export type IsolatePackageOptions = {
  imports?: Record<string, string> | undefined
  install?: ((cwd: string) => Promise<void>) | undefined
  onPackageJson?:
    | ((pkgJson: PackageJson) => PackageJson | Promise<PackageJson>)
    | undefined
  sourcePath?: string | undefined
}

export type IsolatePackageResult = {
  exports?: Record<string, any> | undefined
  tmpdir: string
}

/**
 * Isolates a package in a temporary test environment.
 *
 * Supports multiple input types:
 * 1. File system path (absolute or relative)
 * 2. Package name with optional version spec
 * 3. npm package spec (parsed via npm-package-arg)
 *
 * @throws {Error} When package installation or setup fails.
 */
export async function isolatePackage(
  packageSpec: string,
  options?: IsolatePackageOptions | undefined,
): Promise<IsolatePackageResult> {
  const opts = { __proto__: null, ...options } as IsolatePackageOptions
  const { imports, install, onPackageJson, sourcePath: optSourcePath } = opts

  let sourcePath = optSourcePath
  let packageName: string | undefined
  let spec: string | undefined

  // Determine if this is a path or package spec.
  if (isPath(packageSpec)) {
    // File system path.
    sourcePath = path.resolve(packageSpec)

    if (!existsSync(sourcePath)) {
      throw new Error(`Source path does not exist: ${sourcePath}`)
    }

    // Read package.json to get the name.
    const pkgJson = await readPackageJson(sourcePath, { normalize: true })
    packageName = pkgJson.name as string
  } else {
    // Parse as npm package spec.
    const npa = /*@__PURE__*/ require('../external/npm-package-arg')
    const parsed = npa(packageSpec)

    packageName = parsed.name

    if (parsed.type === 'directory' || parsed.type === 'file') {
      sourcePath = parsed.fetchSpec
      if (!existsSync(sourcePath)) {
        throw new Error(`Source path does not exist: ${sourcePath}`)
      }
    } else {
      // Registry package.
      spec = parsed.fetchSpec || parsed.rawSpec
    }
  }

  if (!packageName) {
    throw new Error(`Could not determine package name from: ${packageSpec}`)
  }

  // Create temp directory for this package.
  const sanitizedName = packageName.replace(/[@/]/g, '-')
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `socket-test-${sanitizedName}-`),
  )
  const packageTempDir = path.join(tempDir, sanitizedName)
  await fs.mkdir(packageTempDir, { recursive: true })

  let installedPath: string
  let originalPackageJson: PackageJson | undefined

  if (spec) {
    // Installing from registry first, then copying source on top if provided.
    await fs.writeFile(
      path.join(packageTempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-temp',
          private: true,
          version: '1.0.0',
        },
        null,
        2,
      ),
    )

    // Use custom install function or default pnpm install.
    if (install) {
      await install(packageTempDir)
    } else {
      const { spawn } = /*@__PURE__*/ require('../spawn')
      const packageInstallSpec = spec.startsWith('https://')
        ? spec
        : `${packageName}@${spec}`

      await spawn('pnpm', ['add', packageInstallSpec], {
        cwd: packageTempDir,
        stdio: 'pipe',
      })
    }

    installedPath = path.join(packageTempDir, 'node_modules', packageName)

    // Save original package.json before copying source.
    originalPackageJson = await readPackageJson(installedPath, {
      normalize: true,
    })

    // Copy source files on top if provided.
    if (sourcePath) {
      // Check if source and destination are the same (symlinked).
      const realInstalledPath = await resolveRealPath(installedPath)
      const realSourcePath = await resolveRealPath(sourcePath)

      if (realSourcePath !== realInstalledPath) {
        await fs.cp(sourcePath, installedPath, FS_CP_OPTIONS)
      }
    }
  } else {
    // Just copying local package, no registry install.
    if (!sourcePath) {
      throw new Error('sourcePath is required when no version spec provided')
    }

    const scopedPath = packageName.startsWith('@')
      ? path.join(packageTempDir, 'node_modules', packageName.split('/')[0])
      : path.join(packageTempDir, 'node_modules')

    await fs.mkdir(scopedPath, { recursive: true })
    installedPath = path.join(packageTempDir, 'node_modules', packageName)

    await fs.cp(sourcePath, installedPath, FS_CP_OPTIONS)
  }

  // Prepare package.json if callback provided or if we need to merge with original.
  if (onPackageJson || originalPackageJson) {
    const pkgJsonPath = path.join(installedPath, 'package.json')
    const mergedPkgJson = await mergePackageJson(
      pkgJsonPath,
      originalPackageJson,
    )

    const finalPkgJson = onPackageJson
      ? await onPackageJson(mergedPkgJson)
      : mergedPkgJson

    await fs.writeFile(pkgJsonPath, JSON.stringify(finalPkgJson, null, 2))
  }

  // Install dependencies.
  if (install) {
    await install(installedPath)
  } else {
    const { spawn } = /*@__PURE__*/ require('../spawn')
    await spawn('pnpm', ['install'], {
      cwd: installedPath,
      stdio: 'pipe',
    })
  }

  // Load module exports if imports provided.
  const exports: Record<string, any> = imports
    ? { __proto__: null }
    : undefined!

  if (imports) {
    for (const { 0: key, 1: specifier } of Object.entries(imports)) {
      const fullPath = path.join(installedPath, specifier)
      exports[key] = require(fullPath)
    }
  }

  return {
    exports,
    tmpdir: installedPath,
  }
}
