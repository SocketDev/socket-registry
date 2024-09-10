'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const { ignores } = require('./constants')

const rootPath = path.resolve(__dirname, '..')
const absNpmTemplatesPath = path.join(__dirname, 'templates/npm')

const EMPTY_CONTENT = '/* empty */\n'

;(async () => {
  const autoPatterns = ['**/auto.{d.ts,js}']
  const autoFiles = await tinyGlob(autoPatterns, {
    ignore: ignores,
    absolute: true,
    cwd: rootPath,
    onlyFiles: true
  })
  const autoFile = autoFiles.find(n => n.includes(absNpmTemplatesPath))
  const OLD_EMPTY_CONTENT = await fs.readFile(autoFile, 'utf8')
  const OLD_EMPTY_CONTENT_BYTES = Buffer.byteLength(OLD_EMPTY_CONTENT, 'utf8')
  for (const filepath of autoFiles) {
    if ((await fs.stat(filepath)).size === OLD_EMPTY_CONTENT_BYTES) {
      await fs.writeFile(filepath, EMPTY_CONTENT, 'utf8')
    }
  }
  const files = await tinyGlob(['**/*.{d.ts,js}'], {
    ignore: [...autoPatterns, ...ignores],
    absolute: true,
    cwd: rootPath,
    onlyFiles: true
  })
  for (const filepath of files) {
    if (
      (await fs.stat(filepath)).size === OLD_EMPTY_CONTENT_BYTES &&
      (await fs.readFile(filepath, 'utf8')) === OLD_EMPTY_CONTENT
    ) {
      await fs.writeFile(filepath, EMPTY_CONTENT, 'utf8')
    }
  }
})()
