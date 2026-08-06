/**
 * @file Update root package.json with default Node.js engine range.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'

import { PACKAGE_DEFAULT_NODE_RANGE } from '../constants/node.mts'
import { ROOT_PACKAGE_JSON_PATH } from '../constants/paths.mts'

import type { EditablePackageJson } from '@socketsecurity/lib-stable/packages/types'

const logger = getDefaultLogger()

/**
 * Update engines field in root package.json.
 */
async function main(): Promise<void> {
  const rootEditablePkgJson = (await readPackageJson(ROOT_PACKAGE_JSON_PATH, {
    editable: true,
    normalize: true,
  })) as EditablePackageJson | undefined
  if (!rootEditablePkgJson) {
    throw new Error(`Root package.json not found at ${ROOT_PACKAGE_JSON_PATH}`)
  }
  // Update engines field.
  rootEditablePkgJson.update({
    engines: {
      ...rootEditablePkgJson.content.engines,
      node: PACKAGE_DEFAULT_NODE_RANGE,
    },
  })
  await rootEditablePkgJson.save()
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
