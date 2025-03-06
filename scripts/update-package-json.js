'use strict'

const constants = require('@socketregistry/scripts/constants')
const { runScript } = require('@socketsecurity/registry/lib/npm')
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')

void (async () => {
  // Lazily access constants.rootPackageJsonPath.
  const rootEditablePkgJson = await readPackageJson(
    constants.rootPackageJsonPath,
    {
      editable: true
    }
  )
  // Lazily access constants.maintainedNodeVersions.
  const { current, next } = constants.maintainedNodeVersions
  // Update engines field.
  rootEditablePkgJson.update({
    engines: { node: `^${current} || >=${next}` }
  })
  await rootEditablePkgJson.save()
  await runScript('update:package-lock', ['--', '--force'], {
    // Lazily access constants.rootPath.
    cwd: constants.rootPath,
    stdio: 'inherit'
  })
})()
