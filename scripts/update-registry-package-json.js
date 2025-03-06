'use strict'

const builtinNames = require('@socketregistry/packageurl-js/data/npm/builtin-names.json')
const constants = require('@socketregistry/scripts/constants')
const { toSortedObject } = require('@socketsecurity/registry/lib/objects')
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')

void (async () => {
  const registryEditablePkgJson = await readPackageJson(
    // Lazily access constants.registryPkgPath.
    constants.registryPkgPath,
    {
      editable: true
    }
  )
  const { content: registryPkgJson } = registryEditablePkgJson
  const browser = { ...registryPkgJson.browser }
  for (const builtinName of builtinNames) {
    browser[builtinName] = false
  }
  registryEditablePkgJson.update({
    browser: toSortedObject(browser),
    // Lazily access constants.maintainedNodeVersions.
    engines: { node: `>=${constants.maintainedNodeVersions.last}` }
  })
  await registryEditablePkgJson.save()
})()
