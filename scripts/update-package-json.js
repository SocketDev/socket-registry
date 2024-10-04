'use strict'

const path = require('node:path')

const constants = require('@socketregistry/scripts/constants')
const { REGISTRY_WORKSPACE, rootPackageJsonPath, rootPackagesPath } = constants
const { readDirNames } = require('@socketregistry/scripts/utils/fs')
const { readPackageJson } = require('@socketregistry/scripts/utils/packages')

;(async () => {
  const rootEditablePkgJson = await readPackageJson(rootPackageJsonPath, {
    editable: true
  })
  // Update workspaces.
  const workspaces = [REGISTRY_WORKSPACE]
  // Lazily access constants.ecosystems.
  for (const eco of constants.ecosystems) {
    const ecoPackagesPath = path.join(rootPackagesPath, eco)
    // No need to sort because readDirNames returns names sorted by default.
    const packageNames = await readDirNames(ecoPackagesPath)
    for (const regPkgName of packageNames) {
      workspaces.push(`packages/${eco}/${regPkgName}`)
    }
  }
  rootEditablePkgJson.update({ workspaces })
  // Lazily access constants.maintainedNodeVersions.
  const { maintainedNodeVersions } = constants
  const nodeVerNext = maintainedNodeVersions.get('next')
  const nodeVerCurr = maintainedNodeVersions.get('current')
  // Update engines field.
  rootEditablePkgJson.update({
    engines: { node: `^${nodeVerCurr} || >=${nodeVerNext}` }
  })
  rootEditablePkgJson.save()
})()
