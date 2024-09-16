#!/usr/bin/env node
'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const { EMPTY_FILE, ignores } = require('@socketregistry/scripts/constants')
const { localCompare } = require('@socketregistry/scripts/utils/strings')

const rootPath = path.resolve(__dirname, '..')
const npmTemplatesPath = path.join(__dirname, 'templates/npm')

;(async () => {
  const autoPatterns = ['**/auto.{d.ts,js}']
  const autoFiles = (
    await tinyGlob(autoPatterns, {
      ignore: ignores,
      absolute: true,
      cwd: rootPath
    })
  ).sort(localCompare)

  if (autoFiles.length === 0) {
    return
  }
  const autoFile =
    autoFiles.find(n => n.includes(npmTemplatesPath)) ?? autoFiles[0]

  const OLD_EMPTY_CONTENT = await fs.readFile(autoFile, 'utf8')
  const OLD_EMPTY_CONTENT_BYTES = Buffer.byteLength(OLD_EMPTY_CONTENT, 'utf8')

  for (const filepath of autoFiles) {
    if ((await fs.stat(filepath)).size === OLD_EMPTY_CONTENT_BYTES) {
      await fs.writeFile(filepath, EMPTY_FILE, 'utf8')
    }
  }
  const otherFiles = (
    await tinyGlob(['**/*.{d.ts,js}'], {
      ignore: [...autoPatterns, ...ignores],
      absolute: true,
      cwd: rootPath
    })
  ).sort(localCompare)
  for (const filepath of otherFiles) {
    if (
      (await fs.stat(filepath)).size === OLD_EMPTY_CONTENT_BYTES &&
      (await fs.readFile(filepath, 'utf8')) === OLD_EMPTY_CONTENT
    ) {
      await fs.writeFile(filepath, EMPTY_FILE, 'utf8')
    }
  }
})()
