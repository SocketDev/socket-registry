'use strict'

import { createRequire } from 'node:module'
import constants from '@socketregistry/scripts/constants'

const require = createRequire(import.meta.url)
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')

void (async () => {
  const rootEditablePkgJson = await readPackageJson(
    constants.rootPackageJsonPath,
    {
      editable: true,
      normalize: true,
    },
  )
  // Update engines field.
  rootEditablePkgJson.update({
    engines: {
      ...rootEditablePkgJson.content.engines,
      node: constants.PACKAGE_DEFAULT_NODE_RANGE,
    },
  })
  await rootEditablePkgJson.save()
})()
