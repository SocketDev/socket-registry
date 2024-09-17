#!/usr/bin/env node
'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { default: confirm } = require('@inquirer/confirm')
const { default: didYouMean, ReturnTypeEnums } = require('didyoumean2')
const { default: input } = require('@inquirer/input')
const { default: select } = require('@inquirer/select')
const { default: search } = require('@inquirer/search')
const { glob: tinyGlob } = require('tinyglobby')
const validateNpmPackageName = require('validate-npm-package-name')
const { PACKAGE_JSON, tsLibs } = require('./constants')

const rootPath = path.resolve(__dirname, '..')
const npmPackagesPath = path.join(rootPath, 'packages/npm')
const npmTemplatesPath = path.join(__dirname, 'templates/npm')

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
    message: 'Give the package a name',
    validate: value => validateNpmPackageName(value).validForNewPackages
  })
  const templateChoice = await select({
    message: `Choose ${pkgName}'s template`,
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
  let ts_lib
  if (templateChoice.startsWith('es-shim')) {
    const availableTsLibs = [...tsLibs]
    const maxTsLibLength = availableTsLibs.reduce(
      (n, v) => Math.max(n, v.length),
      0
    )
    if (
      await confirm({
        message: `Does ${pkgName} need a TypeScript lib?`,
        default: false
      })
    ) {
      ts_lib = await search({
        message: 'Which one?',
        source: async input => {
          if (!input) return []
          const truncated = input.slice(0, maxTsLibLength)
          return didYouMean(truncated, availableTsLibs, {
            deburr: false,
            returnType: ReturnTypeEnums.ALL_SORTED_MATCHES,
            threshold: 0.3
          }).map(l => ({ name: l, value: l }))
        }
      })
    }
  }
  const srcPath = templates[templateChoice]
  const destPath = path.join(npmPackagesPath, pkgName)
  const pkgJsonPath = path.join(destPath, PACKAGE_JSON)

  await fs.copy(srcPath, destPath)

  const actions = []
  if (ts_lib) {
    const tsFiles = await tinyGlob(['**/*.ts'], {
      absolute: true,
      cwd: destPath
    })
    const tsData = {
      ts_lib
    }
    for (const filepath of tsFiles) {
      actions.push([filepath, tsData])
    }
  }
  const pkgJsonData = {
    name: pkgName,
    category: 'cleanup'
  }
  actions.push([pkgJsonPath, pkgJsonData])

  await Promise.all(
    actions.map(
      async ({ 0: filepath, 1: data }) =>
        await fs.writeFile(
          filepath,
          modifyContent(await fs.readFile(filepath, 'utf8'), data),
          'utf8'
        )
    )
  )

  console.log('All done 🎉')
})()
