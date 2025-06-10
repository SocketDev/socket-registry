'use strict'

const constants = require('@socketregistry/scripts/constants')
const { runScript } = require('@socketsecurity/registry/lib/npm')
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')

void (async () => {
  // Lazily access constants.rootPackageJsonPath.
  const rootEditablePkgJson = await readPackageJson(
    constants.rootPackageJsonPath,
    {
      editable: true,
      normalize: true
    }
  )
  // Update engines field.
  rootEditablePkgJson.update({
    // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
    engines: { node: constants.PACKAGE_DEFAULT_NODE_RANGE }
  })
  await rootEditablePkgJson.save()
  await runScript('update:package-lock', ['--', '--force'], {
    // Lazily access constants.rootPath.
    cwd: constants.rootPath,
    stdio: 'inherit'
  })
})()
