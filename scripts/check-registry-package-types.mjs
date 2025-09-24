'use strict'

import { createRequire } from 'node:module'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { escapeRegExp } from '../registry/lib/regexps.js'

import constants from './constants.mjs'

const require = createRequire(import.meta.url)

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
