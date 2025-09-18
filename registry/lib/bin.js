'use strict'

const { readJsonSync } = /*@__PURE__*/ require('./fs')
const { getOwn } = /*@__PURE__*/ require('./objects')
const { isPath, normalizePath } = /*@__PURE__*/ require('./path')
const { spawn } = /*@__PURE__*/ require('./spawn')

let _fs
/**
 * Lazily load the fs module to avoid Webpack errors.
 * @returns {import('fs')} The Node.js fs module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = /*@__PURE__*/ require('fs')
  }
  return _fs
}

let _path
/**
 * Lazily load the path module to avoid Webpack errors.
 * @returns {import('path')} The Node.js path module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path
}

let _which
/**
 * Lazily load the which module for finding executables.
 * @returns {import('which')} The which module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getWhich() {
  if (_which === undefined) {
    _which = /*@__PURE__*/ require('../external/which')
  }
  return _which
}

/*@__NO_SIDE_EFFECTS__*/
/**
 * Create an error for when a binary path cannot be resolved.
 * @param {string} binPath - The binary path that couldn't be resolved.
 * @param {string} [source=''] - Optional source context for debugging.
 * @returns {Error} The error object.
 */
function getNotResolvedError(binPath, source = '') {
  // Based on node-which:
  // ISC License
  // Copyright (c) Isaac Z. Schlueter and Contributors
  // https://github.com/npm/node-which/blob/v5.0.0/lib/index.js#L15
  const error = new Error(
    `not resolved: ${binPath}${source ? `:\n\n${source}` : ''}`
  )
  error.code = 'ENOENT'
  return error
}

/*@__NO_SIDE_EFFECTS__*/
/**
 * Execute a binary with the given arguments.
 * @param {string} binPath - Path or name of the binary to execute.
 * @param {string[] | readonly string[]} args - Arguments to pass to the binary.
 * @param {import('./spawn').SpawnOptions} [options] - Spawn options.
 * @returns {Promise<{ stdout: string; stderr: string }>} Command output.
 */
function execBin(binPath, args, options) {
  return spawn(
    /*@__PURE__*/ require('./constants/exec-path'),
    [
      .../*@__PURE__*/ require('./constants/node-no-warnings-flags'),
      isPath(binPath) ? resolveBinPathSync(binPath) : whichBinSync(binPath),
      ...args
    ],
    options
  )
}

/**
 * Find and resolve a binary in the system PATH asynchronously.
 * @template {import('which').Options} T
 * @param {string} binName - Name of the binary to find.
 * @param {T} options - Options for the which module.
 * @returns {T extends {all: true, nothrow: true} ? Promise<string[] | null> : T extends {all: true} ? Promise<string[]> : T extends {nothrow: true} ? Promise<string | null> : Promise<string>} The resolved binary path(s).
 * @throws {Error} If the binary is not found and nothrow is false.
 */
async function whichBin(binName, options) {
  const which = getWhich()
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  const result = await which(binName, options)

  // When 'all: true' is specified, ensure we always return an array.
  if (options?.all) {
    const paths = Array.isArray(result)
      ? result
      : typeof result === 'string'
        ? [result]
        : result
    // If all is true and we have paths, resolve each one.
    return paths?.length ? paths.map(p => resolveBinPathSync(p)) : paths
  }

  return resolveBinPathSync(result)
}

/**
 * Find and resolve a binary in the system PATH synchronously.
 * @template {import('which').Options} T
 * @param {string} binName - Name of the binary to find.
 * @param {T} options - Options for the which module.
 * @returns {T extends {all: true, nothrow: true} ? string[] | null : T extends {all: true} ? string[] : T extends {nothrow: true} ? string | null : string} The resolved binary path(s).
 * @throws {Error} If the binary is not found and nothrow is false.
 */
function whichBinSync(binName, options) {
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  const result = getWhich().sync(binName, options)

  // When 'all: true' is specified, ensure we always return an array.
  if (getOwn(options, 'all')) {
    const paths = Array.isArray(result)
      ? result
      : typeof result === 'string'
        ? [result]
        : result
    // If all is true and we have paths, resolve each one.
    return paths?.length ? paths.map(p => resolveBinPathSync(p)) : paths
  }

  return resolveBinPathSync(result)
}

/**
 * Check if a directory path contains any shadow bin patterns.
 * @param {string} dirPath - Directory path to check.
 * @returns {boolean} True if the path contains shadow bin patterns.
 */
function isShadowBinPath(dirPath) {
  return (
    dirPath.includes('shadow-bin') ||
    dirPath.includes('shadow-npm-bin') ||
    dirPath.includes('shadow-pnpm-bin') ||
    dirPath.includes('shadow-yarn-bin')
  )
}

/**
 * Find the real executable for a binary, bypassing shadow bins.
 * @param {string} binName - Name of the binary to find.
 * @param {string[]} commonPaths - Common paths to check first.
 * @returns {string} The path to the real binary.
 */
function findRealBin(binName, commonPaths = []) {
  const fs = getFs()
  const path = getPath()
  const which = getWhich()

  // Try common locations first.
  for (const binPath of commonPaths) {
    if (fs.existsSync(binPath)) {
      return binPath
    }
  }

  // Fall back to which.sync if no direct path found.
  const binPath = which.sync(binName, { nothrow: true })
  if (binPath) {
    const binDir = path.dirname(binPath)

    if (isShadowBinPath(binDir)) {
      // This is likely a shadowed binary, try to find the real one.
      const allPaths = which.sync(binName, { all: true, nothrow: true }) || []
      // Ensure allPaths is an array.
      const pathsArray = Array.isArray(allPaths)
        ? allPaths
        : typeof allPaths === 'string'
          ? [allPaths]
          : []

      for (const altPath of pathsArray) {
        const altDir = path.dirname(altPath)
        if (!isShadowBinPath(altDir)) {
          return altPath
        }
      }
    }
    return binPath
  }
  // If all else fails, return the binary name and let the system resolve it.
  return binName
}

/**
 * Find the real npm executable, bypassing any aliases and shadow bins.
 * @returns {string} The path to the real npm binary.
 */
function findRealNpm() {
  const fs = getFs()
  const path = getPath()

  // Try to find npm in the same directory as the node executable.
  const nodeDir = path.dirname(process.execPath)
  const npmInNodeDir = path.join(nodeDir, 'npm')

  if (fs.existsSync(npmInNodeDir)) {
    return npmInNodeDir
  }

  // Try common npm locations.
  const commonPaths = ['/usr/local/bin/npm', '/usr/bin/npm']
  const result = findRealBin('npm', commonPaths)

  // If we found a valid path, return it.
  if (fs.existsSync(result)) {
    return result
  }

  // As a last resort, try to use whichBinSync to find npm.
  // This handles cases where npm is installed in non-standard locations.
  const npmPath = whichBinSync('npm', { nothrow: true })
  if (npmPath && fs.existsSync(npmPath)) {
    return npmPath
  }

  // Return the basic 'npm' and let the system resolve it.
  return 'npm'
}

/**
 * Find the real pnpm executable, bypassing any aliases and shadow bins.
 * @returns {string} The path to the real pnpm binary.
 */
function findRealPnpm() {
  const ENV = /*@__PURE__*/ require('./constants/env')
  const WIN32 = /*@__PURE__*/ require('./constants/win32')
  const path = getPath()

  // Try common pnpm locations.
  const commonPaths = WIN32
    ? [
        // Windows common paths.
        path.join(ENV.APPDATA, 'npm', 'pnpm.cmd'),
        path.join(ENV.APPDATA, 'npm', 'pnpm'),
        path.join(ENV.LOCALAPPDATA, 'pnpm', 'pnpm.cmd'),
        path.join(ENV.LOCALAPPDATA, 'pnpm', 'pnpm'),
        'C:\\Program Files\\nodejs\\pnpm.cmd',
        'C:\\Program Files\\nodejs\\pnpm'
      ].filter(Boolean)
    : [
        // Unix common paths.
        '/usr/local/bin/pnpm',
        '/usr/bin/pnpm',
        path.join(ENV.XDG_DATA_HOME, 'pnpm/pnpm'),
        path.join(ENV.HOME, '.pnpm/pnpm')
      ].filter(Boolean)

  return findRealBin('pnpm', commonPaths)
}

/**
 * Find the real yarn executable, bypassing any aliases and shadow bins.
 * @returns {string} The path to the real yarn binary.
 */
function findRealYarn() {
  const ENV = /*@__PURE__*/ require('./constants/env')
  const path = getPath()

  // Try common yarn locations.
  const commonPaths = [
    '/usr/local/bin/yarn',
    '/usr/bin/yarn',
    path.join(ENV.HOME, '.yarn/bin/yarn'),
    path.join(ENV.HOME, '.config/yarn/global/node_modules/.bin/yarn')
  ].filter(Boolean)

  return findRealBin('yarn', commonPaths)
}

/*@__NO_SIDE_EFFECTS__*/
/**
 * Resolve a binary path to its actual executable file.
 * Handles Windows .cmd wrappers and Unix shell scripts.
 * @param {string} binPath - The binary path to resolve.
 * @returns {string} The resolved executable path.
 * @throws {Error} If the binary cannot be resolved.
 */
function resolveBinPathSync(binPath) {
  // Normalize the path once for consistent pattern matching.
  binPath = normalizePath(binPath)

  const fs = getFs()
  const path = getPath()

  const ext = path.extname(binPath)
  const extLowered = ext.toLowerCase()
  const basename = path.basename(binPath, ext)
  const voltaIndex =
    basename === 'node' ? -1 : (/(?<=\/)\.volta\//i.exec(binPath)?.index ?? -1)
  if (voltaIndex !== -1) {
    const voltaPath = binPath.slice(0, voltaIndex)
    const voltaToolsPath = path.join(voltaPath, 'tools')
    const voltaImagePath = path.join(voltaToolsPath, 'image')
    const voltaUserPath = path.join(voltaToolsPath, 'user')
    const voltaPlatform = readJsonSync(
      path.join(voltaUserPath, 'platform.json'),
      { throws: false }
    )
    const voltaNodeVersion = voltaPlatform?.node?.runtime
    const voltaNpmVersion = voltaPlatform?.node?.npm
    let voltaBinPath = ''
    if (basename === 'npm' || basename === 'npx') {
      if (voltaNpmVersion) {
        const relCliPath = `bin/${basename}-cli.js`
        voltaBinPath = path.join(
          voltaImagePath,
          `npm/${voltaNpmVersion}/${relCliPath}`
        )
        if (voltaNodeVersion && !fs.existsSync(voltaBinPath)) {
          voltaBinPath = path.join(
            voltaImagePath,
            `node/${voltaNodeVersion}/lib/node_modules/npm/${relCliPath}`
          )
          if (!fs.existsSync(voltaBinPath)) {
            voltaBinPath = ''
          }
        }
      }
    } else {
      const voltaUserBinPath = path.join(voltaUserPath, 'bin')
      const binInfo = readJsonSync(
        path.join(voltaUserBinPath, `${basename}.json`),
        { throws: false }
      )
      const binPackage = binInfo?.package
      if (binPackage) {
        voltaBinPath = path.join(
          voltaImagePath,
          `packages/${binPackage}/bin/${basename}`
        )
        if (!fs.existsSync(voltaBinPath)) {
          voltaBinPath = `${voltaBinPath}.cmd`
          if (!fs.existsSync(voltaBinPath)) {
            voltaBinPath = ''
          }
        }
      }
    }
    if (voltaBinPath) {
      return fs.realpathSync.native(voltaBinPath)
    }
  }
  const WIN32 = /*@__PURE__*/ require('./constants/win32')
  if (WIN32) {
    const hasKnownExt =
      extLowered === '' || extLowered === '.cmd' || extLowered === '.ps1'
    const isNpmOrNpx = basename === 'npm' || basename === 'npx'
    const isPnpmOrYarn = basename === 'pnpm' || basename === 'yarn'
    if (hasKnownExt && isNpmOrNpx) {
      // The quick route assumes a bin path like: C:\Program Files\nodejs\npm.cmd
      const quickPath = path.join(
        path.dirname(binPath),
        `node_modules/npm/bin/${basename}-cli.js`
      )
      if (fs.existsSync(quickPath)) {
        return fs.realpathSync.native(quickPath)
      }
    }
    let relPath = ''
    if (hasKnownExt) {
      const source = fs.readFileSync(binPath, 'utf8')
      if (isNpmOrNpx) {
        if (extLowered === '.cmd') {
          // "npm.cmd" and "npx.cmd" defined by
          // https://github.com/npm/cli/blob/v11.4.2/bin/npm.cmd
          // https://github.com/npm/cli/blob/v11.4.2/bin/npx.cmd
          relPath =
            basename === 'npm'
              ? /(?<="NPM_CLI_JS=%~dp0\\).*(?=")/.exec(source)?.[0]
              : /(?<="NPX_CLI_JS=%~dp0\\).*(?=")/.exec(source)?.[0]
        } else if (extLowered === '') {
          // Extensionless "npm" and "npx" defined by
          // https://github.com/npm/cli/blob/v11.4.2/bin/npm
          // https://github.com/npm/cli/blob/v11.4.2/bin/npx
          relPath =
            basename === 'npm'
              ? /(?<=NPM_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0]
              : /(?<=NPX_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0]
        } else if (extLowered === '.ps1') {
          // "npm.ps1" and "npx.ps1" defined by
          // https://github.com/npm/cli/blob/v11.4.2/bin/npm.ps1
          // https://github.com/npm/cli/blob/v11.4.2/bin/npx.ps1
          relPath =
            basename === 'npm'
              ? /(?<=\$NPM_CLI_JS="\$PSScriptRoot\/).*(?=")/.exec(source)?.[0]
              : /(?<=\$NPX_CLI_JS="\$PSScriptRoot\/).*(?=")/.exec(source)?.[0]
        }
      } else if (isPnpmOrYarn) {
        if (extLowered === '.cmd') {
          // pnpm.cmd and yarn.cmd can have different formats depending on installation method
          // Common formats include:
          // 1. Setup-pnpm action format: node "%~dp0\..\pnpm\bin\pnpm.cjs" %*
          // 2. npm install -g pnpm format: similar to cmd-shim
          // 3. Standalone installer format: various patterns

          // Try setup-pnpm/setup-yarn action format first
          relPath = /(?<=node\s+")%~dp0\\([^"]+)(?="\s+%\*)/.exec(source)?.[1]

          // Try alternative format: "%~dp0\node.exe" "%~dp0\..\package\bin\binary.js" %*
          if (!relPath) {
            relPath =
              /(?<="%~dp0\\[^"]*node[^"]*"\s+")%~dp0\\([^"]+)(?="\s+%\*)/.exec(
                source
              )?.[1]
          }

          // Try cmd-shim format as fallback
          if (!relPath) {
            relPath = /(?<="%dp0%\\).*(?=" %\*\r\n)/.exec(source)?.[0]
          }
        } else if (extLowered === '') {
          // Extensionless pnpm/yarn - try common shebang formats
          // Handle pnpm installed via standalone installer or global install
          // Format: exec "$basedir/node"  "$basedir/.tools/pnpm/VERSION/..." "$@"
          // Note: may have multiple spaces between arguments
          relPath = /(?<="\$basedir\/)\.tools\/pnpm\/[^"]+(?="\s+"\$@")/.exec(
            source
          )?.[0]
          if (!relPath) {
            // Also try: exec node  "$basedir/.tools/pnpm/VERSION/..." "$@"
            relPath =
              /(?<=exec\s+node\s+"\$basedir\/)\.tools\/pnpm\/[^"]+(?="\s+"\$@")/.exec(
                source
              )?.[0]
          }
          if (!relPath) {
            // Try standard cmd-shim format: exec node "$basedir/../package/bin/binary.js" "$@"
            relPath = /(?<="\$basedir\/).*(?=" "\$@"\n)/.exec(source)?.[0]
          }
        } else if (extLowered === '.ps1') {
          // PowerShell format
          relPath = /(?<="\$basedir\/).*(?=" $args\n)/.exec(source)?.[0]
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
        relPath = /(?<="%dp0%\\).*(?=" %\*\r\n)/.exec(source)?.[0]
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
        relPath = /(?<="$basedir\/).*(?=" "\$@"\n)/.exec(source)?.[0]
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
        relPath = /(?<="\$basedir\/).*(?=" $args\n)/.exec(source)?.[0]
      }
      if (!relPath) {
        throw getNotResolvedError(binPath, source)
      }
      binPath = normalizePath(path.join(path.dirname(binPath), relPath))
    } else if (
      extLowered !== '.js' &&
      extLowered !== '.cjs' &&
      extLowered !== '.mjs' &&
      extLowered !== '.ts' &&
      extLowered !== '.cts' &&
      extLowered !== '.mts'
    ) {
      throw getNotResolvedError(binPath)
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
          const stats = fs.statSync(baseBinPath)
          // Only use this path if it's a file (the shell script).
          if (stats.isFile()) {
            binPath = baseBinPath
            // Recompute hasNoExt since we changed the path.
            hasNoExt = !path.extname(binPath)
          }
        } catch {
          // If stat fails, continue with the original path.
        }
      }
    }

    if (hasNoExt && (isPnpmOrYarn || isNpmOrNpx)) {
      const source = fs.readFileSync(binPath, 'utf8')
      let relPath = ''

      if (isPnpmOrYarn) {
        // Handle pnpm/yarn Unix shell scripts.
        // Format: exec "$basedir/node" "$basedir/.tools/pnpm/VERSION/..." "$@"
        // or: exec node "$basedir/.tools/pnpm/VERSION/..." "$@"
        relPath = /(?<="\$basedir\/)\.tools\/[^"]+(?="\s+"\$@")/.exec(
          source
        )?.[0]
        if (!relPath) {
          // Try standard cmd-shim format: exec node "$basedir/../package/bin/binary.js" "$@"
          // Example: exec node  "$basedir/../pnpm/bin/pnpm.cjs" "$@"
          //                              ^^^^^^^^^^^^^^^^^^^^^ captures this part
          // This regex needs to be more careful to not match "$@" at the end.
          relPath = /(?<="\$basedir\/)[^"]+(?="\s+"\$@")/.exec(source)?.[0]
        }
        // Special case for setup-pnpm GitHub Action which may use a different format.
        // The setup-pnpm action creates a shell script that references ../pnpm/bin/pnpm.cjs
        if (!relPath) {
          // Try to match: exec node  "$basedir/../pnpm/bin/pnpm.cjs" "$@"
          const match = /exec\s+node\s+"?\$basedir\/([^"]+)"?\s+"\$@"/.exec(
            source
          )
          if (match) {
            relPath = match[1]
          }
        }
        // Check if the extracted path looks wrong (e.g., pnpm/bin/pnpm.cjs without ../).
        // This happens with setup-pnpm action when it creates a malformed shell script.
        if (relPath && basename === 'pnpm' && relPath.startsWith('pnpm/')) {
          // The path should be ../pnpm/... not pnpm/...
          // Prepend ../ to fix the relative path.
          relPath = '../' + relPath
        }
      } else if (isNpmOrNpx) {
        // Handle npm/npx Unix shell scripts
        relPath =
          basename === 'npm'
            ? /(?<=NPM_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0]
            : /(?<=NPX_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0]
      }

      if (relPath) {
        // Normalize the relative path to handle .. segments properly.
        const resolvedPath = path.resolve(path.dirname(binPath), relPath)
        binPath = normalizePath(resolvedPath)
      }
    }
  }
  try {
    return fs.realpathSync.native(binPath)
  } catch (error) {
    // Provide more context when realpath fails.
    if (error.code === 'ENOTDIR') {
      throw new Error(`Path resolution failed - not a directory: ${binPath}`)
    }
    throw error
  }
}

module.exports = {
  execBin,
  findRealBin,
  findRealNpm,
  findRealPnpm,
  findRealYarn,
  isShadowBinPath,
  resolveBinPathSync,
  whichBin,
  whichBinSync
}
