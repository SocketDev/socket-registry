/** @fileoverview Script for updating empty files to use standard empty content. */

import fs from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from '@socketsecurity/lib/argv/parse'
import { EMPTY_FILE } from '@socketsecurity/lib/constants/core'
import { UTF8 } from '@socketsecurity/lib/constants/encoding'
import fastGlob from 'fast-glob'

import { NPM_TEMPLATES_PATH, ROOT_PATH } from './constants/paths.mjs'
import { getIgnoreGlobs } from './constants/utils.mjs'
import { getModifiedFiles } from './utils/git.mjs'

const { values: cliArgs } = parseArgs({
  options: {
    force: {
      type: 'boolean',
      short: 'f',
    },
    quiet: {
      type: 'boolean',
    },
  },
  strict: false,
})

const AUTO_FILE_GLOB_RECURSIVE = '**/auto.{d.ts,js}'

async function main() {
  const ignoreGlobs = getIgnoreGlobs()
  const modifiedAutoFile = (
    await getModifiedFiles({ absolute: true, cwd: NPM_TEMPLATES_PATH })
  ).find(p => path.basename(p).startsWith('auto.'))
  // Exit early if no relevant files have been modified.
  if (!cliArgs.force && !modifiedAutoFile) {
    return
  }
  const autoFiles = await fastGlob.glob([AUTO_FILE_GLOB_RECURSIVE], {
    ignore: ignoreGlobs,
    absolute: true,
    cwd: NPM_TEMPLATES_PATH,
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
        cwd: ROOT_PATH,
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
}

main().catch(console.error)
