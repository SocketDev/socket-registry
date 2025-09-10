'use strict'

const { promises: fs } = require('node:fs')
const path = require('node:path')

const constants = require('@socketregistry/scripts/constants')

const { escapeRegExp } = require('../registry/lib/regexps')

void (async () => {
  const { registryPkgPath, rootPath } = constants

  const libPath = path.join(registryPkgPath, 'lib')
  const constantsPath = path.join(libPath, 'constants')
  const libConstantsJsPath = path.join(constantsPath, 'index.js')
  const libConstantsDtsPath = path.join(constantsPath, 'index.d.ts')
  const relLibConstDtsPath = path.relative(rootPath, libConstantsDtsPath)

  const constObj = require(libConstantsJsPath)
  const constDtsContent = await fs.readFile(libConstantsDtsPath, 'utf8')

  for (const key of Object.keys(constObj)) {
    const pattern = new RegExp(`readonly ['"\\[]?${escapeRegExp(key)}:`)
    if (!pattern.test(constDtsContent)) {
      throw new Error(`Type '${key}' not declared in ${relLibConstDtsPath}`)
    }
  }
})()
