/**
 * @fileoverview Updates all LICENSE files in the project to match the root LICENSE.
 * Ensures consistent licensing across all packages and subdirectories by copying
 * the root LICENSE content to all LICENSE files found in the project tree.
 * Ignores original license files and template directories.
 */

import fs from 'node:fs/promises'

import { globStreamLicenses } from '@socketsecurity/registry/lib/globs'
import { parallelEach } from '@socketsecurity/registry/lib/streams'

import constants from './constants.mjs'

const { LICENSE, LICENSE_CONTENT, UTF8 } = constants

void (async () => {
  // Stream all LICENSE files in the project, excluding originals and templates.
  const stream = globStreamLicenses(constants.rootPath, {
    recursive: true,
    ignoreOriginals: true,
    ignore: [LICENSE, 'scripts/templates', ...constants.ignoreGlobs],
  })

  // Update each LICENSE file with the root LICENSE content.
  await parallelEach(
    stream,
    licensePath => fs.writeFile(licensePath, LICENSE_CONTENT, UTF8),
    { concurrency: 8 },
  )
})()
