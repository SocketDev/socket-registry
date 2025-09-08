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

function isJsonPrimitive(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number'
  )
}

const excludedKeys = new Set([
  'NODE_VERSION',
  'PACKAGE_DEFAULT_NODE_RANGE',
  'execPath',
  'npmExecPath',
  'npmRealExecPath',
  'pacoteCachePath'
])

;(async () => {
  const constantsObj = require(libConstantsJsPath)
  const constantsContent = await fs.readFile(libConstantsJsPath, 'utf8')
  const constantsMagicString = new MagicString(constantsContent)

  for (const key of Object.keys(constantsObj)) {
    if (excludedKeys.has(key)) {
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
