'use strict'

const path = require('node:path')
const { promises: fs } = require('node:fs')

const MagicString = require('magic-string')

const { escapeRegExp } = require('../lib/regexps')
const { toKebabCase } = require('../lib/strings')

const scriptsPath = __dirname
const rootPath = path.join(scriptsPath, '..')
const libPath = path.join(rootPath, 'lib')
const constantsPath = path.join(libPath, 'constants')
const libConstantsJsPath = path.join(constantsPath, 'index.js')

const exportJsonPrimitiveRegExp =
  /module\.exports *= *(?:null|undefined|\d|'|")/

function isJsonPrimitive(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'string'
  )
}

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
  'parseArgsConfig',
  'skipTestsByEcosystem',
  'spinner',
  'tsLibsAvailable',
  'tsTypesAvailable',
  'win32EnsureTestsByEcosystem'
])

;(async () => {
  const constantsObj = require(libConstantsJsPath)
  const constantsContent = await fs.readFile(libConstantsJsPath, 'utf8')
  const constantsMagicString = new MagicString(constantsContent)

  for (const key of Object.keys(constantsObj)) {
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
    if (!isJsonPrimitive(value)) {
      continue
    }
    const pattern = new RegExp(`\\b${escapeRegExp(key)}:.+`)
    const match = pattern.exec(constantsContent)
    if (!match) {
      continue
    }
    const start = match.index
    const end = start + match[0].length
    const rawStr = JSON.stringify(value)
    const str = typeof value === 'string' ? `'${rawStr.slice(1, -1)}'` : rawStr
    const replacement = `${key}: ${str},`
    constantsMagicString.overwrite(start, end, replacement)
  }
  await fs.writeFile(
    libConstantsJsPath,
    constantsMagicString.toString(),
    'utf8'
  )
  console.log(`✅ Inlined constants`)
})()
