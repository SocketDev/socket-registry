/**
 * @file The test-install harness for npm package overrides: pnpm install flag
 *   sets, a temp-dir installer that lays a Socket override on top of the real
 *   package, and the capturing spawn wrapper they share. Split out of
 *   package.mts so that file (the package.json read/update toolkit) stays under
 *   the file-size soft cap; package.mts re-exports these so existing import
 *   paths keep resolving.
 */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { WIN32 } from '@socketsecurity/lib-stable/constants/platform'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'

import { cleanTestScript } from './script-cleaning.mts'
import { spawn } from './spawn.mts'
import { testRunners } from './test-runners.mts'
import { ROOT_PATH } from '../../constants/paths.mts'

// Shared pnpm flags to make it behave like npm with hoisting.
export const PNPM_NPM_LIKE_FLAGS = [
  '--config.shamefully-hoist=true',
  '--config.node-linker=hoisted',
  '--config.auto-install-peers=false',
  '--config.strict-peer-dependencies=false',
]

// Basic pnpm install flags for CI-friendly behavior.
// These are for isolated test installs of third-party packages we don't control.
export const PNPM_INSTALL_BASE_FLAGS = [
  // Allow git-resolved subdeps in third-party packages (e.g. evalmd → markdown-it).
  '--config.blockExoticSubdeps=false',
  // Prevent interactive prompts in CI environments.
  '--config.confirmModulesPurge=false',
  // Allow third-party build scripts (e.g. core-js, es5-ext postinstall).
  '--config.strictDepBuilds=false',
  // Allow lockfile updates (required for test package installations).
  '--no-frozen-lockfile',
]

// Pnpm install flags with hoisting for npm-like behavior.
export const PNPM_HOISTED_INSTALL_FLAGS = [
  ...PNPM_NPM_LIKE_FLAGS,
  ...PNPM_INSTALL_BASE_FLAGS,
]

// Environment override to force pnpm to install devDependencies.
// By default, pnpm skips devDependencies when CI or NODE_ENV=production is detected.
export const PNPM_INSTALL_ENV = { CI: undefined, NODE_ENV: undefined }

/**
 * Builds test environment with proper PATH for test runners.
 */
export function buildTestEnv(
  packageTempDir: string,
  installedPath: string,
): NodeJS.ProcessEnv {
  const packageBinPath = path.join(packageTempDir, 'node_modules', '.bin')
  const nestedBinPath = path.join(installedPath, 'node_modules', '.bin')
  const rootBinPath = path.join(ROOT_PATH, 'node_modules', '.bin')
  return {
    ...process.env,
    PATH: `${nestedBinPath}${path.delimiter}${packageBinPath}${path.delimiter}${rootBinPath}${path.delimiter}${process.env['PATH']}`,
  }
}

export interface InstallPackageForTestingResult {
  installed: boolean
  packagePath?: string | undefined
  reason?: string | undefined
}

/**
 * Install a package for testing in a temporary directory.
 */
export async function installPackageForTesting(
  sourcePath: string,
  packageName: string,
  options: { versionSpec?: string | undefined } = {},
): Promise<InstallPackageForTestingResult> {
  const { versionSpec } = { __proto__: null, ...options } as {
    versionSpec?: string | undefined
  }

  if (!existsSync(sourcePath)) {
    return {
      installed: false,
      reason: `Source path does not exist: ${sourcePath}`,
    }
  }

  try {
    // Create temp directory for this package.
    const sanitizedName = packageName.replace(/[@/]/g, '-')
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `socket-test-${sanitizedName}-`),
    )
    const packageTempDir = path.join(tempDir, sanitizedName)
    await fs.mkdir(packageTempDir, { recursive: true })

    let installedPath: string
    let originalScripts: Record<string, string> | undefined
    let originalDevDependencies: Record<string, string> | undefined

    if (versionSpec) {
      // Installing from npm registry first, then copying source on top
      // Create minimal package.json in temp directory.
      await fs.writeFile(
        path.join(packageTempDir, 'package.json'),
        JSON.stringify(
          {
            name: 'test-temp',
            version: '1.0.0',
            private: true,
          },
          null,
          2,
        ),
      )

      // Write pnpm-workspace.yaml to scope the temp install.
      await fs.writeFile(
        path.join(packageTempDir, 'pnpm-workspace.yaml'),
        'packages:\n  - .\n',
      )

      // Install the package.
      const packageSpec = versionSpec.startsWith('https://')
        ? versionSpec
        : `${packageName}@${versionSpec}`

      await spawnCapture(
        'pnpm',
        ['add', packageSpec, ...PNPM_HOISTED_INSTALL_FLAGS],
        {
          cwd: packageTempDir,
        },
      )

      installedPath = path.join(packageTempDir, 'node_modules', packageName)

      // Check if the installed path is a symlink to the source path.
      let realInstalledPath
      try {
        realInstalledPath = await fs.realpath(installedPath)
      } catch {
        realInstalledPath = path.resolve(installedPath)
      }

      let realSourcePath
      try {
        realSourcePath = await fs.realpath(sourcePath)
      } catch {
        realSourcePath = path.resolve(sourcePath)
      }

      // Skip if source and destination resolve to the same path.
      if (realSourcePath === realInstalledPath) {
        return {
          installed: false,
          reason: 'Package is already a Socket override (symlinked)',
        }
      }

      // Save original scripts and devDependencies before copying.
      const originalPkgJson = await readPackageJson(installedPath, {
        normalize: true,
      })
      originalScripts = originalPkgJson?.scripts
      originalDevDependencies = originalPkgJson?.devDependencies
    } else {
      // Just copying local package, no npm install
      const scopedPath = packageName.startsWith('@')
        ? path.join(
            packageTempDir,
            'node_modules',
            packageName.split('/')[0] ?? packageName,
          )
        : path.join(packageTempDir, 'node_modules')

      await fs.mkdir(scopedPath, { recursive: true })
      installedPath = path.join(packageTempDir, 'node_modules', packageName)
    }

    // Copy source files to installedPath
    await fs.cp(sourcePath, installedPath, {
      force: true,
      recursive: true,
      dereference: true,
      errorOnExist: false,
      ...(WIN32 ? { retryDelay: 100, maxRetries: 3 } : {}),
      filter: src =>
        !src.includes('node_modules') && !src.endsWith('.DS_Store'),
    })

    // Merge back the test scripts and devDependencies if they existed.
    const pkgJsonPath = path.join(installedPath, 'package.json')
    let pkgJson
    try {
      pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))
    } catch (e) {
      throw new Error(`Failed to parse package.json at ${pkgJsonPath}`, {
        cause: e,
      })
    }

    // Preserve devDependencies from original (only when we installed from npm).
    if (versionSpec && originalDevDependencies) {
      pkgJson.devDependencies = originalDevDependencies
    }

    // Preserve test scripts.
    if (originalScripts) {
      const scripts = originalScripts
      pkgJson.scripts = pkgJson.scripts || {}

      // Look for actual test runner in scripts.
      const additionalTestRunners = [...testRunners, 'test:stock', 'test:all']
      let actualTestScript = additionalTestRunners.find(
        runner => scripts[runner],
      )

      if (!actualTestScript && scripts['test']) {
        // Try to extract the test runner from the test script.
        const testMatch = scripts['test'].match(/npm run ([-:\w]+)/)
        const runnerName = testMatch?.[1]
        if (runnerName && scripts[runnerName]) {
          actualTestScript = runnerName
        }
      }

      // Use the actual test script or cleaned version.
      const actualTestScriptBody = actualTestScript
        ? scripts[actualTestScript]
        : undefined
      if (actualTestScript && actualTestScriptBody) {
        pkgJson.scripts.test = cleanTestScript(actualTestScriptBody)
        // Also preserve the actual script if it's referenced.
        if (actualTestScript !== 'test') {
          pkgJson.scripts[actualTestScript] =
            cleanTestScript(actualTestScriptBody)
        }
      } else if (scripts['test']) {
        // Fallback to simple test script if it exists.
        pkgJson.scripts.test = cleanTestScript(scripts['test'])
      }

      // Preserve test:* scripts and the exact key 'tests', but not unrelated
      // names like 'testsuite' that merely begin with 'tests'.
      // oxlint-disable-next-line socket/prefer-cached-for-loop -- iterates Object.entries() (non-array iterable); cached-length would be incorrect.
      for (const { 0: key, 1: value } of Object.entries(scripts)) {
        if (
          (key.startsWith('test:') || key === 'tests') &&
          !pkgJson.scripts[key]
        ) {
          pkgJson.scripts[key] = cleanTestScript(value)
        }
      }
    }

    await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))

    // Install dependencies with pnpm.
    await spawnCapture('pnpm', ['install', ...PNPM_HOISTED_INSTALL_FLAGS], {
      cwd: installedPath,
    })

    return {
      installed: true,
      packagePath: installedPath,
    }
  } catch (e) {
    return {
      installed: false,
      reason: (e as Error).message,
    }
  }
}

/**
 * Run a command with spawn, piping stdio and normalizing error shape.
 *
 * On non-zero exit this throws an Error augmented with
 * `code`/`stdout`/`stderr`, unlike `runCommand` in `./run-command.mts` which
 * returns a number and never throws on non-zero. Use this when you need
 * captured stdio on failure.
 */
export async function spawnCapture(
  command: string,
  args: string[],
  options: Record<string, unknown> = {},
) {
  try {
    const result = await spawn(command, args, {
      stdio: 'pipe',
      shell: WIN32,
      ...options,
    })
    return { stdout: result.stdout, stderr: result.stderr }
  } catch (e) {
    const err = e as {
      code?: number | undefined
      exitCode?: number | undefined
      stdout?: string | undefined
      stderr?: string | undefined
    }
    const commandError: Error & {
      code?: number | undefined
      stdout?: string | undefined
      stderr?: string | undefined
    } = new Error(`Command failed: ${command} ${args.join(' ')}`)
    commandError.code = err.code ?? err.exitCode
    commandError.stdout = err.stdout || ''
    commandError.stderr = err.stderr || ''
    throw commandError
  }
}
