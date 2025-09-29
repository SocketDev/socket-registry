import constants from './constants.mjs'

import { readPackageJson } from '../registry/dist/lib/packages.js'

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
