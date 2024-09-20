'use strict'

const path = require('node:path')

const {
  ecosystems,
  maintainedNodeVersions,
  rootPackageJsonPath,
  rootPackagesPath
} = require('@socketregistry/scripts/constants')
const {
  readDirNames,
  readPackageJson
} = require('@socketregistry/scripts/utils/fs')

;(async () => {
  const rootEditablePkgJson = await readPackageJson(rootPackageJsonPath, {
    editable: true
  })
  // Update workspaces.
  const workspaces = []
  for (const eco of ecosystems) {
    const ecoPackagesPath = path.join(rootPackagesPath, eco)
    const packageNames = await readDirNames(ecoPackagesPath)
    for (const pkgName of packageNames) {
      workspaces.push(`packages/${eco}/${pkgName}`)
    }
  }
  rootEditablePkgJson.update({ workspaces })

  // Update engines field.
  const nodeVerNext = maintainedNodeVersions.get('next')
  const nodeVerCurr = maintainedNodeVersions.get('current')
  rootEditablePkgJson.update({
    engines: { node: `^${nodeVerCurr} || >=${nodeVerNext}` }
  })

  rootEditablePkgJson.save()
})()
