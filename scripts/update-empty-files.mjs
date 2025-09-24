'use strict'

import fs from 'node:fs/promises'
import path from 'node:path'
import util from 'node:util'

import fastGlob from 'fast-glob'

import constants from './constants.mjs'
import { getModifiedFiles } from './lib/git.mjs'

const { EMPTY_FILE, UTF8 } = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

const AUTO_FILE_GLOB_RECURSIVE = '**/auto.{d.ts,js}'

void (async () => {
  const { ignoreGlobs, npmTemplatesPath } = constants
  const modifiedAutoFile = (
    await getModifiedFiles({ absolute: true, cwd: npmTemplatesPath })
  ).find(p => path.basename(p).startsWith('auto.'))
  // Exit early if no relevant files have been modified.
  if (!cliArgs.force && !modifiedAutoFile) {
    return
  }
  const autoFiles = await fastGlob.glob([AUTO_FILE_GLOB_RECURSIVE], {
    ignore: ignoreGlobs,
    absolute: true,
    cwd: npmTemplatesPath,
  })
  const autoFile = modifiedAutoFile || autoFiles.at(0)
  if (autoFile === undefined) {
    return
  }
  const OLD_EMPTY_CONTENT = await fs.readFile(autoFile, UTF8)
  const OLD_EMPTY_CONTENT_BYTES = Buffer.byteLength(OLD_EMPTY_CONTENT, UTF8)

  await Promise.all(
    autoFiles.map(async filepath => {
      if ((await fs.stat(filepath)).size === OLD_EMPTY_CONTENT_BYTES) {
        await fs.writeFile(filepath, EMPTY_FILE, UTF8)
      }
    }),
  )
  await Promise.all(
    (
      await fastGlob.glob(['**/*.{d.ts,js}'], {
        ignore: [AUTO_FILE_GLOB_RECURSIVE, ...ignoreGlobs],
        absolute: true,
        cwd: constants.rootPath,
      })
    ).map(async filepath => {
      if (
        (await fs.stat(filepath)).size === OLD_EMPTY_CONTENT_BYTES &&
        (await fs.readFile(filepath, UTF8)) === OLD_EMPTY_CONTENT
      ) {
        await fs.writeFile(filepath, EMPTY_FILE, UTF8)
      }
    }),
  )
})()
