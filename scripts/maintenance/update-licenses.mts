/**
 * @fileoverview Updates all LICENSE files in the project to match the root LICENSE.
 * Ensures consistent licensing across all packages and subdirectories by copying
 * the root LICENSE content to all LICENSE files found in the project tree.
 * Ignores original license files and template directories.
 */

import { promises as fs } from 'node:fs'

import { UTF8 } from '@socketsecurity/lib/constants/encoding'
import { globStreamLicenses } from '@socketsecurity/lib/globs'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { parallelEach } from '@socketsecurity/lib/streams'

import { LICENSE, ROOT_PATH } from '../constants/paths.mts'
import { getIgnoreGlobs, getLicenseContent } from '../constants/utils.mts'

const logger = getDefaultLogger()

async function main(): Promise<void> {
  // Stream all LICENSE files in the project, excluding originals and templates.
  const stream = globStreamLicenses(ROOT_PATH, {
    recursive: true,
    ignoreOriginals: true,
    ignore: [LICENSE, 'scripts/templates', ...getIgnoreGlobs()],
  })

  // Update each LICENSE file with the root LICENSE content.
  await parallelEach(
    stream,
    licensePath => fs.writeFile(licensePath, getLicenseContent(), UTF8),
    { concurrency: 8 },
  )
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
