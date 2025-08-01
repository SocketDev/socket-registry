'use strict'

const fs = require('node:fs/promises')

const constants = require('@socketregistry/scripts/constants')
const { globStreamLicenses } = require('@socketsecurity/registry/lib/globs')
const { transform } = require('@socketsecurity/registry/lib/streams')

const { LICENSE, LICENSE_CONTENT, UTF8, ignoreGlobs, rootPath } = constants

void (async () => {
  const stream = await globStreamLicenses(rootPath, {
    recursive: true,
    ignoreOriginals: true,
    ignore: [LICENSE, 'scripts/templates', ...ignoreGlobs]
  })

  for await (const licensePath of transform(
    8, // Concurrency level.
    async filepath => filepath,
    stream
  )) {
    fs.writeFile(licensePath, LICENSE_CONTENT, UTF8)
  }
})()
