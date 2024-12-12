'use strict'

const { onExit } = require('signal-exit')

const constants = require('@socketregistry/scripts/constants')
const { rootPackageJsonPath, rootPath } = constants
const { runScript } = require('@socketsecurity/registry/lib/npm')
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')

const abortController = new AbortController()
const { signal: abortSignal } = abortController

// Detect ^C, i.e. Ctrl + C.
onExit(() => {
  abortController.abort()
})

void (async () => {
  const rootEditablePkgJson = await readPackageJson(rootPackageJsonPath, {
    editable: true
  })
  // Lazily access constants.maintainedNodeVersions.
  const { current, next } = constants.maintainedNodeVersions
  // Update engines field.
  rootEditablePkgJson.update({
    engines: { node: `^${current} || >=${next}` }
  })
  rootEditablePkgJson.save()

  await runScript('update:package-lock', ['--', '--force'], {
    cwd: rootPath,
    signal: abortSignal,
    stdio: 'inherit'
  })
})()
