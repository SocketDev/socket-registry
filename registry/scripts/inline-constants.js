'use strict'

const path = require('node:path')
const { promises: fs } = require('node:fs')

const MagicString = require('magic-string')

const { isJsonPrimitive } = require('../lib/json')
const { escapeRegExp } = require('../lib/regexps')
const { toKebabCase } = require('../lib/strings')

const scriptsPath = __dirname
const rootPath = path.join(scriptsPath, '..')
const libPath = path.join(rootPath, 'lib')
const constantsPath = path.join(libPath, 'constants')
const libConstantsJsPath = path.join(constantsPath, 'index.js')

const exportJsonPrimitiveRegExp =
  /module\.exports *= *(?:null|undefined|\d|'|")/

const excludedKeys = new Set([
  'ENV',
  'DARWIN',
  'NODE_VERSION',
  'PACKAGE_DEFAULT_NODE_RANGE',
  'PACKAGE_DEFAULT_SOCKET_CATEGORIES',
  'SUPPORTS_NODE_COMPILE_CACHE_API',
  'SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR',
  'SUPPORTS_NODE_DISABLE_WARNING_FLAG',
  'SUPPORTS_NODE_PERMISSION_FLAG',
  'SUPPORTS_NODE_REQUIRE_MODULE',
  'SUPPORTS_NODE_RUN',
  'SUPPORTS_PROCESS_SEND',
  'UNDEFINED_TOKEN',
  'WIN32',
  'abortController',
  'abortSignal',
  'copyLeftLicenses',
  'execPath',
  'ipcObject',
  'kInternalsSymbol',
  'lifecycleScriptNames',
  'maintainedNodeVersions',
  'nodeDebugFlags',
  'nodeHardenFlags',
  'nodeNoWarningsFlags',
  'npmExecPath',
  'npmRealExecPath',
  'packumentCache',
  'pacoteCachePath',
  'packageExtensions',
  'spinner',
  'tsLibsAvailable',
  'tsTypesAvailable'
])

void (async () => {
  const constObj = require(libConstantsJsPath)
  const constContent = await fs.readFile(libConstantsJsPath, 'utf8')
  const constMagicString = new MagicString(constContent)

  for (const key of Object.keys(constObj)) {
    if (excludedKeys.has(key)) {
      continue
    }
    const keyPath = path.join(constantsPath, `${toKebabCase(key)}.js`)
    // eslint-disable-next-line no-await-in-loop
    const keyContent = await fs.readFile(keyPath, 'utf8')
    if (!exportJsonPrimitiveRegExp.test(keyContent)) {
      continue
    }
    const value = require(path.join(constantsPath, `${toKebabCase(key)}.js`))
    const pattern = new RegExp(`\\b${escapeRegExp(key)}:.+`)
    const match = pattern.exec(constContent)
    if (!match) {
      continue
    }
    const start = match.index
    const end = start + match[0].length
    if (!isJsonPrimitive(value)) {
      constMagicString.overwrite(start, end, `${key}: undefined,`)
      continue
    }
    const rawStr = JSON.stringify(value)
    const inlineStr =
      typeof value === 'string' ? `'${rawStr.slice(1, -1)}'` : rawStr
    constMagicString.overwrite(start, end, `${key}: ${inlineStr},`)
  }
  await fs.writeFile(libConstantsJsPath, constMagicString.toString(), 'utf8')
  console.log(`✅ Inlined constants`)
})()
