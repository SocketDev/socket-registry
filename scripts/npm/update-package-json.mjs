/** @fileoverview Update root package.json with default Node.js engine range. */

import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { readPackageJson } from '@socketsecurity/lib/packages'

import { PACKAGE_DEFAULT_NODE_RANGE } from '../constants/node.mjs'
import { ROOT_PACKAGE_JSON_PATH } from '../constants/paths.mjs'

const logger = getDefaultLogger()

/**
 * Update engines field in root package.json.
 */
async function main() {
  const rootEditablePkgJson = await readPackageJson(ROOT_PACKAGE_JSON_PATH, {
    editable: true,
    normalize: true,
  })
  // Update engines field.
  rootEditablePkgJson.update({
    engines: {
      ...rootEditablePkgJson.content.engines,
      node: PACKAGE_DEFAULT_NODE_RANGE,
    },
  })
  await rootEditablePkgJson.save()
}

main().catch(e => logger.error(e))
