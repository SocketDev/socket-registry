'use strict'

const { isDebug } = /*@__PURE__*/ require('./debug')
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
  ).filter(a => !isAuditFlag(a) && !isFundFlag(a) && !isProgressFlag(a))
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)
  const logLevelArgs =
    // The default value of loglevel is "notice". We default to "warn" which is
    // one level quieter.
    useDebug || npmArgs.some(isLoglevelFlag) ? [] : ['--loglevel', 'warn']
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
function isAuditFlag(cmdArg) {
  return auditFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isFundFlag(cmdArg) {
  return fundFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isLoglevelFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v11/using-npm/logging#setting-log-levels
  return cmdArg.startsWith('--loglevel=') || logFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNodeOptionsFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v9/using-npm/config#node-options
  return cmdArg.startsWith('--node-options=')
}

/*@__NO_SIDE_EFFECTS__*/
function isProgressFlag(cmdArg) {
  return progressFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function realExecPathSync(npmOrNpxExecPath) {
  const fs = getFs()
  const WIN32 = /*@__PURE__*/ require('./constants/win32')
  let binPath = npmOrNpxExecPath
  if (WIN32) {
    const path = getPath()
    const basename = path.basename(npmOrNpxExecPath).toLoweCase()
    if (basename.endsWith('.cmd')) {
      const basenameWithoutExt = basename.slice(0, -4)
      if (basenameWithoutExt === 'npm' || basenameWithoutExt === 'npx') {
        // The npm.CMD looks like:
        // :: Created by npm, please don't edit manually.
        // @ECHO OFF
        //
        // SETLOCAL
        //
        // SET "NODE_EXE=%~dp0\node.exe"
        // IF NOT EXIST "%NODE_EXE%" (
        //   SET "NODE_EXE=node"
        // )
        //
        // SET "NPM_PREFIX_JS=%~dp0\node_modules\npm\bin\npm-prefix.js"
        // SET "NPM_CLI_JS=%~dp0\node_modules\npm\bin\npm-cli.js"
        // FOR /F "delims=" %%F IN ('CALL "%NODE_EXE%" "%NPM_PREFIX_JS%"') DO (
        //   SET "NPM_PREFIX_NPM_CLI_JS=%%F\node_modules\npm\bin\npm-cli.js"
        // )
        // IF EXIST "%NPM_PREFIX_NPM_CLI_JS%" (
        //   SET "NPM_CLI_JS=%NPM_PREFIX_NPM_CLI_JS%"
        // )
        //
        // "%NODE_EXE%" "%NPM_CLI_JS%" %*
        binPath = path.join(
          path.dirname(npmOrNpxExecPath),
          `node_modules/npm/bin/${basenameWithoutExt}-cli.js`
        )
      }
    }
  }
  return fs.realpathSync.native(binPath)
}

/*@__NO_SIDE_EFFECTS__*/
function resolveBinPath(binPath) {
  const fs = getFs()
  const WIN32 = /*@__PURE__*/ require('./constants/win32')
  if (WIN32) {
    const path = getPath()
    const ext = path.extname(binPath)
    const extLowered = ext.toLowerCase()
    if (extLowered === '' || extLowered === '.cmd' || extLowered === '.ps1') {
      const basename = path.basename(binPath, ext)
      const source = fs.readFileSync(binPath, 'utf8')
      let relPath
      if (basename === 'npm' || basename === 'npx') {
        if (extLowered === '.cmd') {
          // "npm.cmd" and "npx.cmd" defined by
          // https://github.com/npm/cli/blob/v11.2.0/bin/npm.cmd
          // https://github.com/npm/cli/blob/v11.2.0/bin/npx.cmd
          relPath =
            basename === 'npm'
              ? /(?<="NPM_CLI_JS=%~dp0\\).*(?=")/.exec(source)?.[0]
              : /(?<="NPX_CLI_JS=%~dp0\\).*(?=")/.exec(source)?.[0]
        } else if (extLowered === '') {
          // Extensionless "npm" and "npx" defined by
          // https://github.com/npm/cli/blob/v11.2.0/bin/npm.cmd
          // https://github.com/npm/cli/blob/v11.2.0/bin/npx.cmd
          relPath =
            basename === 'npm'
              ? /(?<=NPM_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0]
              : /(?<=NPX_CLI_JS="\$CLI_BASEDIR\/).*(?=")/.exec(source)?.[0]
        } else if (extLowered === '.ps1') {
          // "npm.ps1" and "npx.ps1" defined by
          // https://github.com/npm/cli/blob/v11.2.0/bin/npm.ps1
          // https://github.com/npm/cli/blob/v11.2.0/bin/npx.ps1
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
        ? resolveBinPath(binPath)
        : whichBinSync(binPath),
      ...args
    ],
    options
  )
}

/*@__NO_SIDE_EFFECTS__*/
function runScript(scriptName, args, options) {
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
  return resolveBinPath(await which(binName, options))
}

function whichBinSync(binName, options) {
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  return resolveBinPath(getWhich().sync(binName, options))
}

module.exports = {
  execNpm,
  isAuditFlag,
  isFundFlag,
  isLoglevelFlag,
  isNodeOptionsFlag,
  isProgressFlag,
  realExecPathSync,
  resolveBinPath,
  runBin,
  runScript,
  whichBin,
  whichBinSync
}
