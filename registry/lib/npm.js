'use strict'

const { isDebug } = /*@__PURE__*/ require('./debug')
const { readJsonSync } = /*@__PURE__*/ require('./fs')
const { isRelative } = /*@__PURE__*/ require('./path')
const { spawn } = /*@__PURE__*/ require('./spawn')

let _fs
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
/*@__NO_SIDE_EFFECTS__*/
function getWhich() {
  if (_which === undefined) {
    _which = /*@__PURE__*/ require('../external/which')
  }
  return _which
}

const auditFlags = new Set(['--audit', '--no-audit'])

const fundFlags = new Set(['--fund', '--no-fund'])

// https://docs.npmjs.com/cli/v11/using-npm/logging#aliases
const logFlags = new Set([
  '--loglevel',
  '-d',
  '--dd',
  '--ddd',
  '-q',
  '--quiet',
  '-s',
  '--silent'
])

const progressFlags = new Set(['--progress', '--no-progress'])

/*@__NO_SIDE_EFFECTS__*/
function execNpm(args, options) {
  const useDebug = isDebug()
  const terminatorPos = args.indexOf('--')
  const npmArgs = (
    terminatorPos === -1 ? args : args.slice(0, terminatorPos)
  ).filter(
    a => !isNpmAuditFlag(a) && !isNpmFundFlag(a) && !isNpmProgressFlag(a)
  )
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)
  const logLevelArgs =
    // The default value of loglevel is "notice". We default to "warn" which is
    // one level quieter.
    useDebug || npmArgs.some(isNpmLoglevelFlag) ? [] : ['--loglevel', 'warn']
  return spawn(
    /*@__PURE__*/ require('./constants/exec-path'),
    [
      .../*@__PURE__*/ require('./constants/node-harden-flags'),
      .../*@__PURE__*/ require('./constants/node-no-warnings-flags'),
      /*@__PURE__*/ require('./constants/npm-real-exec-path'),
      // Even though '--loglevel=error' is passed npm will still run through
      // code paths for 'audit' and 'fund' unless '--no-audit' and '--no-fund'
      // flags are passed.
      '--no-audit',
      '--no-fund',
      // Add `--no-progress` and `--silent` flags to fix input being swallowed
      // by the spinner when running the command with recent versions of npm.
      '--no-progress',
      // Add '--loglevel=error' if a loglevel flag is not provided and the
      // SOCKET_CLI_DEBUG environment variable is not truthy.
      ...logLevelArgs,
      ...npmArgs,
      ...otherArgs
    ],
    {
      __proto__: null,
      ...options
    }
  )
}

/*@__NO_SIDE_EFFECTS__*/
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
function isNpmAuditFlag(cmdArg) {
  return auditFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmFundFlag(cmdArg) {
  return fundFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmLoglevelFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v11/using-npm/logging#setting-log-levels
  return cmdArg.startsWith('--loglevel=') || logFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmNodeOptionsFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v9/using-npm/config#node-options
  return cmdArg.startsWith('--node-options=')
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmProgressFlag(cmdArg) {
  return progressFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function resolveBinPathSync(binPath) {
  const fs = getFs()
  const path = getPath()
  const ext = path.extname(binPath)
  const extLowered = ext.toLowerCase()
  const basename = path.basename(binPath, ext)
  const voltaIndex =
    basename === 'node'
      ? -1
      : (/(?<=[\\/]\.volta[\\/])/i.exec(binPath)?.index ?? -1)

  if (voltaIndex !== -1) {
    const voltaPath = binPath.slice(0, voltaIndex)
    const voltaToolsPath = path.join(voltaPath, 'tools')
    const voltaImagePath = path.join(voltaToolsPath, 'image')
    const voltaUserPath = path.join(voltaToolsPath, 'user')
    const voltaPlatform = readJsonSync(
      path.join(voltaUserPath, 'platform.json')
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
        path.join(voltaUserBinPath, `${basename}.json`)
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
    const source = fs.readFileSync(binPath, 'utf8')
    if (hasKnownExt) {
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
      binPath = path.join(path.dirname(binPath), relPath)
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
  }
  return fs.realpathSync.native(binPath)
}

/*@__NO_SIDE_EFFECTS__*/
function runBin(binPath, args, options) {
  return spawn(
    /*@__PURE__*/ require('./constants/exec-path'),
    [
      .../*@__PURE__*/ require('./constants/node-no-warnings-flags'),
      isRelative(binPath) || getPath().isAbsolute(binPath)
        ? resolveBinPathSync(binPath)
        : whichBinSync(binPath),
      ...args
    ],
    options
  )
}

/*@__NO_SIDE_EFFECTS__*/
function runNpmScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  const useNodeRun =
    !prepost && /*@__PURE__*/ require('./constants/supports-node-run')
  return spawn(
    /*@__PURE__*/ require('./constants/exec-path'),
    [
      .../*@__PURE__*/ require('./constants/node-no-warnings-flags'),
      ...(useNodeRun
        ? ['--run']
        : [/*@__PURE__*/ require('./constants/npm-real-exec-path'), 'run']),
      scriptName,
      ...args
    ],
    {
      __proto__: null,
      ...spawnOptions
    }
  )
}

async function whichBin(binName, options) {
  const which = getWhich()
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  return resolveBinPathSync(await which(binName, options))
}

function whichBinSync(binName, options) {
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  return resolveBinPathSync(getWhich().sync(binName, options))
}

module.exports = {
  execNpm,
  isNpmAuditFlag,
  isNpmFundFlag,
  isNpmLoglevelFlag,
  isNpmNodeOptionsFlag,
  isNpmProgressFlag,
  resolveBinPathSync,
  runBin,
  runNpmScript,
  whichBin,
  whichBinSync
}
