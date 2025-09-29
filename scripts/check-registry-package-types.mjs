import { createRequire } from 'node:module'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { escapeRegExp } from '../registry/src/lib/regexps.ts'

import constants from './constants.mjs'

const require = createRequire(import.meta.url)

async function main() {
  const { registryPkgPath, rootPath } = constants

  const libPath = path.join(registryPkgPath, 'src', 'lib')
  const constantsPath = path.join(libPath, 'constants')
  const libConstantsJsPath = path.join(constantsPath, 'index.ts')
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
}

main().catch(console.error)
