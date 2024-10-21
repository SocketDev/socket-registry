'use strict'

const path = require('node:path')

const constants = require('@socketregistry/scripts/constants')
const {
  PERF_NPM_WORKSPACE,
  REGISTRY_WORKSPACE,
  rootPackageJsonPath,
  rootPackagesPath,
  rootPath
} = constants
const { readDirNames } = require('@socketregistry/scripts/utils/fs')
const { runScript } = require('@socketregistry/scripts/utils/npm')
const { readPackageJson } = require('@socketregistry/scripts/utils/packages')
const { localeCompare } = require('@socketregistry/scripts/utils/sorts')

const abortController = new AbortController()
const { signal } = abortController

// Detect ^C, i.e. Ctrl + C.
process.on('SIGINT', () => {
  console.log('SIGINT signal received: Exiting gracefully...')
  abortController.abort()
})
;(async () => {
  const rootEditablePkgJson = await readPackageJson(rootPackageJsonPath, {
    editable: true
  })
  // Update workspaces.
  const workspaces = [PERF_NPM_WORKSPACE, REGISTRY_WORKSPACE]
  // Lazily access constants.ecosystems.
  for (const eco of constants.ecosystems) {
    const ecoPackagesPath = path.join(rootPackagesPath, eco)
    // No need to sort because readDirNames returns names sorted by default.
    const packageNames = await readDirNames(ecoPackagesPath)
    for (const regPkgName of packageNames) {
      workspaces.push(`packages/${eco}/${regPkgName}`)
    }
  }
  rootEditablePkgJson.update({ workspaces: workspaces.sort(localeCompare) })
  // Lazily access constants.maintainedNodeVersions.
  const { maintainedNodeVersions } = constants
  const nodeVerNext = maintainedNodeVersions.get('next')
  const nodeVerCurr = maintainedNodeVersions.get('current')
  // Update engines field.
  rootEditablePkgJson.update({
    engines: { node: `^${nodeVerCurr} || >=${nodeVerNext}` }
  })
  rootEditablePkgJson.save()

  await runScript('update:package-lock', ['--', '--force'], {
    cwd: rootPath,
    signal,
    stdio: 'inherit'
  })
})()
