'use strict'

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const {
  EMPTY_FILE,
  ignoreGlobs,
  npmTemplatesPath,
  rootPath
} = require('@socketregistry/scripts/constants')

;(async () => {
  const autoPatterns = ['**/auto.{d.ts,js}']
  const autoFiles = await tinyGlob(autoPatterns, {
    ignore: ignoreGlobs,
    absolute: true,
    cwd: rootPath
  })
  if (autoFiles.length === 0) {
    return
  }
  const autoFile =
    autoFiles.find(n => n.includes(npmTemplatesPath)) ?? autoFiles[0]

  const OLD_EMPTY_CONTENT = await fs.readFile(autoFile, 'utf8')
  const OLD_EMPTY_CONTENT_BYTES = Buffer.byteLength(OLD_EMPTY_CONTENT, 'utf8')

  await Promise.all(
    autoFiles.map(async filepath => {
      if ((await fs.stat(filepath)).size === OLD_EMPTY_CONTENT_BYTES) {
        await fs.writeFile(filepath, EMPTY_FILE, 'utf8')
      }
    })
  )
  await Promise.all(
    (
      await tinyGlob(['**/*.{d.ts,js}'], {
        ignore: [...autoPatterns, ...ignoreGlobs],
        absolute: true,
        cwd: rootPath
      })
    ).map(async filepath => {
      if (
        (await fs.stat(filepath)).size === OLD_EMPTY_CONTENT_BYTES &&
        (await fs.readFile(filepath, 'utf8')) === OLD_EMPTY_CONTENT
      ) {
        await fs.writeFile(filepath, EMPTY_FILE, 'utf8')
      }
    })
  )
})()
