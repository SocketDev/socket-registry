'use strict'

const path = require('node:path')
const util = require('node:util')

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const constants = require('@socketregistry/scripts/constants')
const { EMPTY_FILE, ignoreGlobs, npmTemplatesPath, parseArgsConfig, rootPath } =
  constants
const { getModifiedFiles } = require('@socketregistry/scripts/lib/git')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

const AUTO_FILE_GLOB_RECURSIVE = '**/auto.{d.ts,js}'

void (async () => {
  const modifiedAutoFile = (
    await getModifiedFiles({ absolute: true, cwd: npmTemplatesPath })
  ).find(p => path.basename(p).startsWith('auto.'))
  // Exit early if no relevant files have been modified.
  if (!cliArgs.force && !modifiedAutoFile) {
    return
  }
  const autoFiles = await tinyGlob([AUTO_FILE_GLOB_RECURSIVE], {
    // Lazily access constants.ignoreGlobs.
    ignore: constants.ignoreGlobs,
    absolute: true,
    cwd: npmTemplatesPath
  })
  const autoFile = modifiedAutoFile || autoFiles.at(0)
  if (autoFile === undefined) {
    return
  }
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
        ignore: [AUTO_FILE_GLOB_RECURSIVE, ...ignoreGlobs],
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
