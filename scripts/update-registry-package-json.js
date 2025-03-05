'use strict'

const builtinNames = require('@socketregistry/packageurl-js/data/npm/builtin-names.json')
const constants = require('@socketregistry/scripts/constants')
const { toSortedObject } = require('@socketsecurity/registry/lib/objects')
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')

void (async () => {
  // Lazily access constants.registryPkgPath.
  const registryEditablePkgJson = await readPackageJson(
    constants.registryPkgPath,
    {
      editable: true
    }
  )
  const browser = { ...registryEditablePkgJson.content.browser }
  for (const builtinName of builtinNames) {
    browser[builtinName] = false
  }
  registryEditablePkgJson.update({
    browser: toSortedObject(browser)
  })
  await registryEditablePkgJson.save()
})()
