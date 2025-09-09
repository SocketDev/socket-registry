'use strict'

const { promises: fs } = require('node:fs')
const path = require('node:path')

const { escapeRegExp } = require('../registry/lib/regexps')

const scriptsPath = __dirname
const rootPath = path.join(scriptsPath, '..')
const registryPkgPath = path.join(rootPath, 'registry')
const libPath = path.join(registryPkgPath, 'lib')
const constantsPath = path.join(libPath, 'constants')
const libConstantsJsPath = path.join(constantsPath, 'index.js')
const libConstantsDtsPath = path.join(constantsPath, 'index.d.ts')
const relLibConstDtsPath = path.relative(rootPath, libConstantsDtsPath)

void (async () => {
  const constObj = require(libConstantsJsPath)
  const constDtsContent = await fs.readFile(libConstantsDtsPath, 'utf8')

  for (const key of Object.keys(constObj)) {
    const pattern = new RegExp(`readonly ['"\\[]?${escapeRegExp(key)}:`)
    if (!pattern.test(constDtsContent)) {
      throw new Error(`Type '${key}' not declared in ${relLibConstDtsPath}`)
    }
  }
})()
