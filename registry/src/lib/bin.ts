/**
 * @fileoverview Binary path resolution and execution utilities for package managers.
 * Provides cross-platform bin path lookup, command execution, and path normalization.
 */

import { APPDATA } from '#env/appdata'
import { HOME } from '#env/home'
import { LOCALAPPDATA } from '#env/localappdata'
import { XDG_DATA_HOME } from '#env/xdg-data-home'

import { readJsonSync } from './fs'
import { getOwn } from './objects'
import { isPath, normalizePath } from './path'
import { spawn } from './spawn'

let _fs: typeof import('node:fs') | undefined
/**
 * Lazily load the fs module to avoid Webpack errors.
 */
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    _fs = /*@__PURE__*/ require('node:fs')
  }
  // biome-ignore lint/style/noNonNullAssertion: Initialized above.
  return _fs!
}

let _path: typeof import('node:path') | undefined
/**
 * Lazily load the path module to avoid Webpack errors.
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    _path = /*@__PURE__*/ require('node:path')
  }
  // biome-ignore lint/style/noNonNullAssertion: Initialized above.
  return _path!
}

let _which: typeof import('which') | undefined
/**
 * Lazily load the which module for finding executables.
 */
/*@__NO_SIDE_EFFECTS__*/
function getWhich() {
  if (_which === undefined) {
    _which = /*@__PURE__*/ require('../external/which')
  }
  // biome-ignore lint/style/noNonNullAssertion: Initialized above.
  return _which!
}

/**
 * Execute a binary with the given arguments.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function execBin(
  binPath: string,
  args?: string[],
  options?: import('./spawn').SpawnOptions,
) {
  // Resolve the binary path.
  const resolvedPath = isPath(binPath)
    ? resolveBinPathSync(binPath)
    : await whichBin(binPath)

  if (!resolvedPath) {
    const error = new Error(`Binary not found: ${binPath}`) as Error & {
      code: string
    }
    error.code = 'ENOENT'
    throw error
  }

  // Execute the binary directly.
  // biome-ignore lint/style/noNonNullAssertion: which always returns non-empty array.
  const binCommand = Array.isArray(resolvedPath)
    ? resolvedPath[0]!
    : resolvedPath
  return await spawn(binCommand, args ?? [], options)
}

/**
 * Find and resolve a binary in the system PATH asynchronously.
 * @template {import('which').Options} T
 * @throws {Error} If the binary is not found and nothrow is false.
 */
export async function whichBin(
  binName: string,
  options?: import('which').Options,
): Promise<string | string[] | undefined> {
  const which = getWhich()
  // Default to nothrow: true if not specified to return undefined instead of throwing
  const opts = { nothrow: true, ...options }
  // Depending on options `which` may throw if `binName` is not found.
  // With nothrow: true, it returns null when `binName` is not found.
  const result = await which?.(binName, opts)

  // When 'all: true' is specified, ensure we always return an array.
  if (options?.all) {
    const paths = Array.isArray(result)
      ? result
      : typeof result === 'string'
        ? [result]
        : undefined
    // If all is true and we have paths, resolve each one.
    return paths?.length ? paths.map(p => resolveBinPathSync(p)) : paths
  }

  // If result is undefined (binary not found), return undefined
  if (!result) {
    return undefined
  }

  return resolveBinPathSync(result)
}

/**
 * Find and resolve a binary in the system PATH synchronously.
 * @template {import('which').Options} T
 * @throws {Error} If the binary is not found and nothrow is false.
 */
export function whichBinSync(
  binName: string,
  options?: import('which').Options,
): string | string[] | undefined {
  // Default to nothrow: true if not specified to return undefined instead of throwing
  const opts = { nothrow: true, ...options }
  // Depending on options `which` may throw if `binName` is not found.
  // With nothrow: true, it returns null when `binName` is not found.
  const result = getWhich()?.sync(binName, opts)

  // When 'all: true' is specified, ensure we always return an array.
  if (getOwn(options, 'all')) {
    const paths = Array.isArray(result)
      ? result
      : typeof result === 'string'
        ? [result]
        : undefined
    // If all is true and we have paths, resolve each one.
    return paths?.length ? paths.map(p => resolveBinPathSync(p)) : paths
  }

  // If result is undefined (binary not found), return undefined
  if (!result) {
    return undefined
  }

  return resolveBinPathSync(result)
}

/**
 * Check if a directory path contains any shadow bin patterns.
 */
export function isShadowBinPath(dirPath: string | undefined): boolean {
  if (!dirPath) {
    return false
  }
  // Check for node_modules/.bin pattern (Unix and Windows)
  const normalized = dirPath.replace(/\\/g, '/')
  return normalized.includes('node_modules/.bin')
}

/**
 * Find the real executable for a binary, bypassing shadow bins.
 */
export function findRealBin(
  binName: string,
  commonPaths: string[] = [],
): string | undefined {
  const fs = getFs()
  const path = getPath()
  const which = getWhich()

  // Try common locations first.
  for (const binPath of commonPaths) {
    if (fs?.existsSync(binPath)) {
      return binPath
    }
  }

  // Fall back to which.sync if no direct path found.
  const binPath = which?.sync(binName, { nothrow: true })
  if (binPath) {
    const binDir = path?.dirname(binPath)

    if (isShadowBinPath(binDir)) {
      // This is likely a shadowed binary, try to find the real one.
      const allPaths = which?.sync(binName, { all: true, nothrow: true }) || []
      // Ensure allPaths is an array.
      const pathsArray = Array.isArray(allPaths)
        ? allPaths
        : typeof allPaths === 'string'
          ? [allPaths]
          : []

      for (const altPath of pathsArray) {
        const altDir = path?.dirname(altPath)
        if (!isShadowBinPath(altDir)) {
          return altPath
        }
      }
    }
    return binPath
  }
  // If all else fails, return undefined to indicate binary not found.
  return undefined
}

/**
 * Find the real npm executable, bypassing any aliases and shadow bins.
 */
export function findRealNpm(): string {
  const fs = getFs()
  const path = getPath()

  // Try to find npm in the same directory as the node executable.
  const nodeDir = path?.dirname(process.execPath)
  const npmInNodeDir = path?.join(nodeDir, 'npm')

  if (fs?.existsSync(npmInNodeDir)) {
    return npmInNodeDir
  }

  // Try common npm locations.
  const commonPaths = ['/usr/local/bin/npm', '/usr/bin/npm']
  const result = findRealBin('npm', commonPaths)

  // If we found a valid path, return it.
  if (result && fs?.existsSync(result)) {
    return result
  }

  // As a last resort, try to use whichBinSync to find npm.
  // This handles cases where npm is installed in non-standard locations.
  const npmPath = whichBinSync('npm', { nothrow: true })
  if (npmPath && typeof npmPath === 'string' && fs?.existsSync(npmPath)) {
    return npmPath
  }

  // Return the basic 'npm' and let the system resolve it.
  return 'npm'
}

/**
 * Find the real pnpm executable, bypassing any aliases and shadow bins.
 */
export function findRealPnpm(): string {
  const WIN32 = require('../constants/platform').WIN32
  const path = getPath()

  // Try common pnpm locations.
  const commonPaths = WIN32
    ? [
        // Windows common paths.
        // biome-ignore lint/style/noNonNullAssertion: APPDATA and LOCALAPPDATA are always defined on Windows.
        path?.join(APPDATA as string, 'npm', 'pnpm.cmd'),
        // biome-ignore lint/style/noNonNullAssertion: APPDATA and LOCALAPPDATA are always defined on Windows.
        path?.join(APPDATA as string, 'npm', 'pnpm'),
        // biome-ignore lint/style/noNonNullAssertion: APPDATA and LOCALAPPDATA are always defined on Windows.
        path?.join(LOCALAPPDATA as string, 'pnpm', 'pnpm.cmd'),
        // biome-ignore lint/style/noNonNullAssertion: APPDATA and LOCALAPPDATA are always defined on Windows.
        path?.join(LOCALAPPDATA as string, 'pnpm', 'pnpm'),
        'C:\\Program Files\\nodejs\\pnpm.cmd',
        'C:\\Program Files\\nodejs\\pnpm',
      ].filter(Boolean)
    : [
        // Unix common paths.
        '/usr/local/bin/pnpm',
        '/usr/bin/pnpm',
        path?.join(
          (XDG_DATA_HOME as string) || `${HOME as string}/.local/share`,
          'pnpm/pnpm',
        ),
        // biome-ignore lint/style/noNonNullAssertion: HOME is always defined on Unix systems.
        path?.join(HOME as string, '.pnpm/pnpm'),
      ].filter(Boolean)

  return findRealBin('pnpm', commonPaths) ?? ''
}

/**
 * Find the real yarn executable, bypassing any aliases and shadow bins.
 */
export function findRealYarn(): string {
  const path = getPath()

  // Try common yarn locations.
  const commonPaths = [
    '/usr/local/bin/yarn',
    '/usr/bin/yarn',
    // biome-ignore lint/style/noNonNullAssertion: HOME is always defined on Unix systems.
    path?.join(HOME as string, '.yarn/bin/yarn'),
    // biome-ignore lint/style/noNonNullAssertion: HOME is always defined on Unix systems.
    path?.join(HOME as string, '.config/yarn/global/node_modules/.bin/yarn'),
  ].filter(Boolean)

  return findRealBin('yarn', commonPaths) ?? ''
}

/*@__NO_SIDE_EFFECTS__*/
/**
 * Resolve a binary path to its actual executable file.
 * Handles Windows .cmd wrappers and Unix shell scripts.
 */
export function resolveBinPathSync(binPath: string): string {
  const fs = getFs()
  const path = getPath()

  // If it's not an absolute path, try to find it in PATH first
  if (!path?.isAbsolute(binPath)) {
    try {
      const resolved = whichBinSync(binPath)
      if (resolved) {
        // biome-ignore lint/style/noParameterAssign: Reassigning for normalization.
        binPath = resolved as string
      }
    } catch {}
  }

  // Normalize the path once for consistent pattern matching.
  // biome-ignore lint/style/noParameterAssign: Normalizing path for consistent handling.
  binPath = normalizePath(binPath)

  // Handle empty string that normalized to '.' (current directory)
  if (binPath === '.') {
    return binPath
  }

  const ext = path?.extname(binPath)
  const extLowered = ext.toLowerCase()
  const basename = path?.basename(binPath, ext)
  const voltaIndex =
    basename === 'node' ? -1 : (/(?<=\/)\.volta\//i.exec(binPath)?.index ?? -1)
  if (voltaIndex !== -1) {
    const voltaPath = binPath.slice(0, voltaIndex)
    const voltaToolsPath = path?.join(voltaPath, 'tools')
    const voltaImagePath = path?.join(voltaToolsPath, 'image')
    const voltaUserPath = path?.join(voltaToolsPath, 'user')
    const voltaPlatform = readJsonSync(
      path?.join(voltaUserPath, 'platform.json'),
      { throws: false },
    ) as
      // biome-ignore lint/suspicious/noExplicitAny: Volta platform config structure is dynamic.
      any
    const voltaNodeVersion = voltaPlatform?.node?.runtime
    const voltaNpmVersion = voltaPlatform?.node?.npm
    let voltaBinPath = ''
    if (basename === 'npm' || basename === 'npx') {
      if (voltaNpmVersion) {
        const relCliPath = `bin/${basename}-cli.js`
        voltaBinPath = path?.join(
          voltaImagePath,
          `npm/${voltaNpmVersion}/${relCliPath}`,
        )
        if (voltaNodeVersion && !fs?.existsSync(voltaBinPath)) {
          voltaBinPath = path?.join(
            voltaImagePath,
            `node/${voltaNodeVersion}/lib/node_modules/npm/${relCliPath}`,
          )
          if (!fs?.existsSync(voltaBinPath)) {
            voltaBinPath = ''
          }
        }
      }
    } else {
      const voltaUserBinPath = path?.join(voltaUserPath, 'bin')
      const binInfo = readJsonSync(
        path?.join(voltaUserBinPath, `${basename}.json`),
        { throws: false },
      ) as
        // biome-ignore lint/suspicious/noExplicitAny: Volta bin info structure is dynamic.
        any
      const binPackage = binInfo?.package
      if (binPackage) {
        voltaBinPath = path?.join(
          voltaImagePath,
          `packages/${binPackage}/bin/${basename}`,
        )
        if (!fs?.existsSync(voltaBinPath)) {
          voltaBinPath = `${voltaBinPath}.cmd`
          if (!fs?.existsSync(voltaBinPath)) {
            voltaBinPath = ''
          }
        }
      }
    }
    if (voltaBinPath) {
      try {
        return normalizePath(fs?.realpathSync.native(voltaBinPath))
      } catch {}
      return voltaBinPath
    }
  }
  const WIN32 = require('../constants/platform').WIN32
  if (WIN32) {
    const hasKnownExt =
      extLowered === '' ||
      extLowered === '.cmd' ||
      extLowered === '.exe' ||
      extLowered === '.ps1'
    const isNpmOrNpx = basename === 'npm' || basename === 'npx'
    const isPnpmOrYarn = basename === 'pnpm' || basename === 'yarn'
    if (hasKnownExt && isNpmOrNpx) {
      // The quick route assumes a bin path like: C:\Program Files\nodejs\npm.cmd
      const quickPath = path?.join(
        path?.dirname(binPath),
        `node_modules/npm/bin/${basename}-cli.js`,
      )
      if (fs?.existsSync(quickPath)) {
        try {
          return fs?.realpathSync.native(quickPath)
        } catch {}
        return quickPath
      }
    }
    let relPath = ''
    if (
      hasKnownExt &&
      // Only parse shell scripts and batch files, not actual executables.
      // .exe files are already executables and don't need path resolution from wrapper scripts.
      extLowered !== '.exe' &&
      // Check if file exists before attempting to read it to avoid ENOENT errors.
      fs?.existsSync(binPath)
    ) {
      const source = fs?.readFileSync(binPath, 'utf8')
      if (isNpmOrNpx) {
        if (extLowered === '.cmd') {
          // "npm.cmd" and "npx.cmd" defined by
          // https://github.com/npm/cli/blob/v11.4.2/bin/npm.cmd
          // https://github.com/npm/cli/blob/v11.4.2/bin/npx.cmd
          relPath =
            basename === 'npm'
              ? /(?<="NPM_CLI_JS=%~dp0\\).*(?=")/.exec(source)?.[0] || ''
              : /(?<="NPX_CLI_JS=%~dp0\\).*(?=")/.exec(source)?.[0] || ''
        } else if (extLowered === '') {
          // Extensionless "npm" and "npx" defined by
          // https://github.com/npm/cli/blob/v11.4.2/bin/npm
          // https://github.com/npm/cli/blob/v11.4.2/bin/npx
          relPath =
            basename === 'npm'
              ? /(?<=NPM_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0] ||
                ''
              : /(?<=NPX_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0] ||
                ''
        } else if (extLowered === '.ps1') {
          // "npm.ps1" and "npx.ps1" defined by
          // https://github.com/npm/cli/blob/v11.4.2/bin/npm.ps1
          // https://github.com/npm/cli/blob/v11.4.2/bin/npx.ps1
          relPath =
            basename === 'npm'
              ? /(?<=\$NPM_CLI_JS="\$PSScriptRoot\/).*(?=")/.exec(
                  source,
                )?.[0] || ''
              : /(?<=\$NPX_CLI_JS="\$PSScriptRoot\/).*(?=")/.exec(
                  source,
                )?.[0] || ''
        }
      } else if (isPnpmOrYarn) {
        if (extLowered === '.cmd') {
          // pnpm.cmd and yarn.cmd can have different formats depending on installation method
          // Common formats include:
          // 1. Setup-pnpm action format: node "%~dp0\..\pnpm\bin\pnpm.cjs" %*
          // 2. npm install -g pnpm format: similar to cmd-shim
          // 3. Standalone installer format: various patterns

          // Try setup-pnpm/setup-yarn action format first
          relPath =
            /(?<=node\s+")%~dp0\\([^"]+)(?="\s+%\*)/.exec(source)?.[1] || ''

          // Try alternative format: "%~dp0\node.exe" "%~dp0\..\package\bin\binary.js" %*
          if (!relPath) {
            relPath =
              /(?<="%~dp0\\[^"]*node[^"]*"\s+")%~dp0\\([^"]+)(?="\s+%\*)/.exec(
                source,
              )?.[1] || ''
          }

          // Try cmd-shim format as fallback
          if (!relPath) {
            relPath = /(?<="%dp0%\\).*(?=" %\*\r\n)/.exec(source)?.[0] || ''
          }
        } else if (extLowered === '') {
          // Extensionless pnpm/yarn - try common shebang formats
          // Handle pnpm installed via standalone installer or global install
          // Format: exec "$basedir/node"  "$basedir/.tools/pnpm/VERSION/..." "$@"
          // Note: may have multiple spaces between arguments
          relPath =
            /(?<="\$basedir\/)\.tools\/pnpm\/[^"]+(?="\s+"\$@")/.exec(
              source,
            )?.[0] || ''
          if (!relPath) {
            // Also try: exec node  "$basedir/.tools/pnpm/VERSION/..." "$@"
            relPath =
              /(?<=exec\s+node\s+"\$basedir\/)\.tools\/pnpm\/[^"]+(?="\s+"\$@")/.exec(
                source,
              )?.[0] || ''
          }
          if (!relPath) {
            // Try standard cmd-shim format: exec node "$basedir/../package/bin/binary.js" "$@"
            relPath = /(?<="\$basedir\/).*(?=" "\$@"\n)/.exec(source)?.[0] || ''
          }
        } else if (extLowered === '.ps1') {
          // PowerShell format
          relPath = /(?<="\$basedir\/).*(?=" $args\n)/.exec(source)?.[0] || ''
        }
      } else if (extLowered === '.cmd') {
        // "bin.CMD" generated by
        // https://github.com/npm/cmd-shim/blob/v7.0.0/lib/index.js#L98:
        //
        // @ECHO off
        // GOTO start
        // :find_dp0
        // SET dp0=%~dp0
        // EXIT /b
        // :start
        // SETLOCAL
        // CALL :find_dp0
        //
        // IF EXIST "%dp0%\node.exe" (
        //   SET "_prog=%dp0%\node.exe"
        // ) ELSE (
        //   SET "_prog=node"
        //   SET PATHEXT=%PATHEXT:;.JS;=;%
        // )
        //
        // endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\..\<PACKAGE_NAME>\path\to\bin.js" %*
        relPath = /(?<="%dp0%\\).*(?=" %\*\r\n)/.exec(source)?.[0] || ''
      } else if (extLowered === '') {
        // Extensionless "bin" generated by
        // https://github.com/npm/cmd-shim/blob/v7.0.0/lib/index.js#L138:
        //
        // #!/bin/sh
        // basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
        //
        // case `uname` in
        //     *CYGWIN*|*MINGW*|*MSYS*)
        //         if command -v cygpath > /dev/null 2>&1; then
        //             basedir=`cygpath -w "$basedir"`
        //         fi
        //     ;;
        // esac
        //
        // if [ -x "$basedir/node" ]; then
        //   exec "$basedir/node"  "$basedir/../<PACKAGE_NAME>/path/to/bin.js" "$@"
        // else
        //   exec node  "$basedir/../<PACKAGE_NAME>/path/to/bin.js" "$@"
        // fi
        relPath = /(?<="$basedir\/).*(?=" "\$@"\n)/.exec(source)?.[0] || ''
      } else if (extLowered === '.ps1') {
        // "bin.PS1" generated by
        // https://github.com/npm/cmd-shim/blob/v7.0.0/lib/index.js#L192:
        //
        // #!/usr/bin/env pwsh
        // $basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent
        //
        // $exe=""
        // if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
        //   # Fix case when both the Windows and Linux builds of Node
        //   # are installed in the same directory
        //   $exe=".exe"
        // }
        // $ret=0
        // if (Test-Path "$basedir/node$exe") {
        //   # Support pipeline input
        //   if ($MyInvocation.ExpectingInput) {
        //     $input | & "$basedir/node$exe"  "$basedir/../<PACKAGE_NAME>/path/to/bin.js" $args
        //   } else {
        //     & "$basedir/node$exe"  "$basedir/../<PACKAGE_NAME>/path/to/bin.js" $args
        //   }
        //   $ret=$LASTEXITCODE
        // } else {
        //   # Support pipeline input
        //   if ($MyInvocation.ExpectingInput) {
        //     $input | & "node$exe"  "$basedir/../<PACKAGE_NAME>/path/to/bin.js" $args
        //   } else {
        //     & "node$exe"  "$basedir/../<PACKAGE_NAME>/path/to/bin.js" $args
        //   }
        //   $ret=$LASTEXITCODE
        // }
        // exit $ret
        relPath = /(?<="\$basedir\/).*(?=" $args\n)/.exec(source)?.[0] || ''
      }
      if (relPath) {
        // biome-ignore lint/style/noParameterAssign: Resolving wrapper script target.
        binPath = normalizePath(path?.resolve(path?.dirname(binPath), relPath))
      }
    }
  } else {
    // Handle Unix shell scripts (non-Windows platforms)
    let hasNoExt = extLowered === ''
    const isPnpmOrYarn = basename === 'pnpm' || basename === 'yarn'
    const isNpmOrNpx = basename === 'npm' || basename === 'npx'

    // Handle special case where pnpm path in CI has extra segments.
    // In setup-pnpm GitHub Action, the path might be malformed like:
    // /home/runner/setup-pnpm/node_modules/.bin/pnpm/bin/pnpm.cjs
    // This happens when the shell script contains a relative path that
    // when resolved, creates an invalid nested structure.
    if (isPnpmOrYarn && binPath.includes('/.bin/pnpm/bin/')) {
      // Extract the correct pnpm bin path.
      const binIndex = binPath.indexOf('/.bin/pnpm')
      if (binIndex !== -1) {
        // Get the base path up to /.bin/pnpm.
        const baseBinPath = binPath.slice(0, binIndex + '/.bin/pnpm'.length)
        // Check if the original shell script exists.
        try {
          const stats = fs?.statSync(baseBinPath)
          // Only use this path if it's a file (the shell script).
          if (stats.isFile()) {
            // biome-ignore lint/style/noParameterAssign: Fixing pnpm nested bin structure.
            binPath = normalizePath(baseBinPath)
            // Recompute hasNoExt since we changed the path.
            hasNoExt = !path?.extname(binPath)
          }
        } catch {
          // If stat fails, continue with the original path.
        }
      }
    }

    if (
      hasNoExt &&
      (isPnpmOrYarn || isNpmOrNpx) &&
      // For extensionless files (Unix shell scripts), verify existence before reading.
      // This prevents ENOENT errors when the bin path doesn't exist.
      fs?.existsSync(binPath)
    ) {
      const source = fs?.readFileSync(binPath, 'utf8')
      let relPath = ''

      if (isPnpmOrYarn) {
        // Handle pnpm/yarn Unix shell scripts.
        // Format: exec "$basedir/node" "$basedir/.tools/pnpm/VERSION/..." "$@"
        // or: exec node "$basedir/.tools/pnpm/VERSION/..." "$@"
        relPath =
          /(?<="\$basedir\/)\.tools\/[^"]+(?="\s+"\$@")/.exec(source)?.[0] || ''
        if (!relPath) {
          // Try standard cmd-shim format: exec node "$basedir/../package/bin/binary.js" "$@"
          // Example: exec node  "$basedir/../pnpm/bin/pnpm.cjs" "$@"
          //                              ^^^^^^^^^^^^^^^^^^^^^ captures this part
          // This regex needs to be more careful to not match "$@" at the end.
          relPath =
            /(?<="\$basedir\/)[^"]+(?="\s+"\$@")/.exec(source)?.[0] || ''
        }
        // Special case for setup-pnpm GitHub Action which may use a different format.
        // The setup-pnpm action creates a shell script that references ../pnpm/bin/pnpm.cjs
        if (!relPath) {
          // Try to match: exec node  "$basedir/../pnpm/bin/pnpm.cjs" "$@"
          const match = /exec\s+node\s+"?\$basedir\/([^"]+)"?\s+"\$@"/.exec(
            source,
          )
          if (match) {
            relPath = match[1] || ''
          }
        }
        // Check if the extracted path looks wrong (e.g., pnpm/bin/pnpm.cjs without ../).
        // This happens with setup-pnpm action when it creates a malformed shell script.
        if (relPath && basename === 'pnpm' && relPath.startsWith('pnpm/')) {
          // The path should be ../pnpm/... not pnpm/...
          // Prepend ../ to fix the relative path.
          relPath = `../${relPath}`
        }
      } else if (isNpmOrNpx) {
        // Handle npm/npx Unix shell scripts
        relPath =
          basename === 'npm'
            ? /(?<=NPM_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0] || ''
            : /(?<=NPX_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0] || ''
      }

      if (relPath) {
        // Resolve the relative path to handle .. segments properly.
        // biome-ignore lint/style/noParameterAssign: Resolving shell script target.
        binPath = normalizePath(path?.resolve(path?.dirname(binPath), relPath))
      }
    }
  }
  try {
    const realPath = fs?.realpathSync.native(binPath)
    return normalizePath(realPath)
  } catch {}
  // Return normalized path even if realpath fails.
  return normalizePath(binPath)
}
