/** @fileoverview Update root package.json with default Node.js engine range. */

import constants from './constants.mjs'

import { readPackageJson } from '../registry/dist/lib/packages.js'

/**
 * Update engines field in root package.json.
 */
async function main() {
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
}

main().catch(console.error)
