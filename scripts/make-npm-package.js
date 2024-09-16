#!/usr/bin/env node
'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { default: confirm } = require('@inquirer/confirm')
const { default: input } = require('@inquirer/input')
const { default: select } = require('@inquirer/select')
const { glob: tinyGlob } = require('tinyglobby')
const validateNpmPackageName = require('validate-npm-package-name')
const { PACKAGE_JSON } = require('./constants')

const rootPath = path.resolve(__dirname, '..')
const npmPackagesPath = path.join(rootPath, 'packages/npm')
const npmTemplatesPath = path.join(__dirname, 'templates/npm')

const validEsReferences = new Set([
  'dom',
  'decorators',
  'es5',
  'es6',
  'es2015',
  'es2016',
  'es2017',
  'es2018',
  'es2019',
  'es2020',
  'es2021',
  'es2022',
  'es2023',
  'es2024',
  'esnext',
  'webworker'
])

const templates = Object.fromEntries(
  [
    'default',
    'es-shim-prototype-method',
    'es-shim-static-method',
    'node-only',
    'node-plus-browser'
  ].map(k => [k, path.join(npmTemplatesPath, k)])
)

function modifyContent(content, data = {}) {
  let modified = content
  for (const { 0: key, 1: value } of Object.entries(data)) {
    const templateKey = key.replaceAll('-', '_').toUpperCase()
    modified = modified.replaceAll(`%${templateKey}%`, value)
  }
  return modified
}

;(async () => {
  const pkgName = await input({
    message: 'Enter package name',
    validate: value => validateNpmPackageName(value).validForNewPackages
  })
  const templateChoice = await select({
    message: 'Choose a package template',
    choices: [
      { name: 'default', value: 'default' },
      {
        name: 'es-shim prototype method',
        value: 'es-shim-prototype-method'
      },
      { name: 'es-shim static method', value: 'es-shim-static-method' },
      { name: 'node only', value: 'node-only' },
      { name: 'node plus browser', value: 'node-plus-browser' }
    ]
  })

  const srcPath = templates[templateChoice]
  const destPath = path.join(npmPackagesPath, pkgName)
  await fs.copy(srcPath, destPath)

  let ts_lib
  if (templateChoice.startsWith('es-shim')) {
    if (
      await confirm({
        message: 'Does this require a lib reference?',
        default: false
      })
    ) {
      ts_lib = await input({
        message: 'Enter lib reference (e.g. es2024)',
        transformer: value => value.toLowerCase(),
        validate: value => validEsReferences.has(value.toLowerCase())
      })
    }
  }
  if (ts_lib) {
    const tsData = {
      ts_lib
    }
    const tsFiles = await tinyGlob(['**/*.ts'], {
      absolute: true,
      cwd: destPath
    })
    for (const filepath of tsFiles) {
      const content = await fs.readFile(filepath, 'utf8')
      await fs.writeFile(filepath, modifyContent(content, tsData), 'utf8')
    }
  }

  const pkgJsonData = {
    name: pkgName,
    category: 'cleanup'
  }
  const pkgJsonPath = path.join(destPath, PACKAGE_JSON)
  const pkgJsonStr = await fs.readFile(pkgJsonPath, 'utf8')
  await fs.writeFile(
    pkgJsonPath,
    modifyContent(pkgJsonStr, pkgJsonData),
    'utf8'
  )
})()
