import constants from './constants.mjs'

import { readPackageJson } from '@socketsecurity/registry/lib/packages'

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
