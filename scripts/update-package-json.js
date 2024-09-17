'use strict'

const path = require('node:path')

const { glob: tinyGlob } = require('tinyglobby')

const {
  MAINTAINED_NODE_VERSIONS,
  PACKAGE_JSON
} = require('@socketregistry/scripts/constants')
const { trimTrailingSlash } = require('@socketregistry/scripts/utils/path')
const { localCompare } = require('@socketregistry/scripts/utils/sorts')
const { readPackageJson } = require('./utils/fs')

const rootPath = path.resolve(__dirname, '..')
const rootJsonPath = path.join(rootPath, PACKAGE_JSON)
const rootPackagesPath = path.join(rootPath, 'packages')

;(async () => {
  const ecosystems = (
    await tinyGlob(['*/'], {
      cwd: rootPackagesPath,
      onlyDirectories: true,
      expandDirectories: false
    })
  )
    .map(trimTrailingSlash)
    .sort(localCompare)

  // Update workspaces.
  const workspaces = []
  for (const eco of ecosystems) {
    const ecoPackagesPath = path.join(rootPackagesPath, eco)
    const packageNames = (
      await tinyGlob(['*/'], {
        cwd: ecoPackagesPath,
        onlyDirectories: true,
        expandDirectories: false
      })
    )
      .map(trimTrailingSlash)
      .sort(localCompare)
    for (const pkgName of packageNames) {
      workspaces.push(`packages/${eco}/${pkgName}`)
    }
  }
  const rootEditablePkgJson = await readPackageJson(rootJsonPath, {
    editable: true
  })
  rootEditablePkgJson.update({ workspaces })

  // Update engines field.
  const nodeVerNext = MAINTAINED_NODE_VERSIONS.get('next')
  const nodeVerCurr = MAINTAINED_NODE_VERSIONS.get('current')
  rootEditablePkgJson.update({
    engines: { node: `^${nodeVerCurr} || >=${nodeVerNext}` }
  })

  rootEditablePkgJson.save()
})()
