import path from 'node:path'
import { createRequire } from 'node:module'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'

import MagicString from 'magic-string'

import constantsPkg from '../dist/lib/constants/index.js'
import debugPkg from '../dist/lib/debug.js'
import jsonPkg from '../dist/lib/json.js'
import regexpsPkg from '../dist/lib/regexps.js'
import stringsPkg from '../dist/lib/strings.js'

// Inline environment checks to avoid issues during build.
const ENV = {
  CI: 'CI' in process.env,
  VERBOSE_BUILD: process.env.VERBOSE_BUILD === 'true',
  ...constantsPkg.ENV,
}
const { isDebug = () => !!process.env.DEBUG } = debugPkg || {}
const { isJsonPrimitive } = jsonPkg
const { escapeRegExp } = regexpsPkg
const { toKebabCase } = stringsPkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

const scriptsPath = __dirname
const rootPath = path.join(scriptsPath, '..')
const libPath = path.join(rootPath, 'dist', 'lib')
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
  'tsTypesAvailable',
])

void (async () => {
  const constObj = require(libConstantsJsPath)
  const constContent = await fs.readFile(libConstantsJsPath, 'utf8')
  const constMagicString = new MagicString(constContent)
  const inlinedConstants = []

  for (const key of Object.keys(constObj)) {
    if (excludedKeys.has(key)) {
      continue
    }
    // Try the key as-is first (for UPPER_CASE), then try kebab-case (for legacy)
    let keyPath = path.join(constantsPath, `${key}.js`)
    let keyContent
    try {
      // eslint-disable-next-line no-await-in-loop
      keyContent = await fs.readFile(keyPath, 'utf8')
    } catch {
      // Fallback to kebab-case for backward compatibility
      keyPath = path.join(constantsPath, `${toKebabCase(key)}.js`)
      try {
        // eslint-disable-next-line no-await-in-loop
        keyContent = await fs.readFile(keyPath, 'utf8')
      } catch {
        continue
      }
    }
    if (!exportJsonPrimitiveRegExp.test(keyContent)) {
      continue
    }
    const value = require(keyPath)
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
    inlinedConstants.push(key)
  }
  await fs.writeFile(libConstantsJsPath, constMagicString.toString(), 'utf8')
  // Show output in CI or when explicitly requested, otherwise be quiet during install-related lifecycle events.
  const lifecycleEvent = process.env.npm_lifecycle_event
  const isQuietLifecycle =
    lifecycleEvent &&
    (lifecycleEvent === 'prepare' || lifecycleEvent.includes('install'))
  const shouldShowOutput = ENV.CI || ENV.VERBOSE_BUILD || !isQuietLifecycle
  if (shouldShowOutput) {
    if (isDebug()) {
      console.log('Inlined constants:')
      inlinedConstants.forEach(n => console.log(`✅ ${n}`))
    } else if (inlinedConstants.length) {
      console.log(`✅ Inlined constants (${inlinedConstants.length})`)
    }
  }
})()
