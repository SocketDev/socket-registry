'use strict'

const util = require('node:util')

const fs = require('fs-extra')
const updateBrowserslistDb = require('update-browserslist-db')

const constants = require('@socketregistry/scripts/constants')
const { execNpm } = require('@socketsecurity/registry/lib/npm')
const {
  normalizePackageJson
} = require('@socketsecurity/registry/lib/packages')

const { parseArgsConfig, rootPackageLockPath, rootPath, yarnPkgExtsJsonPath } =
  constants

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

async function modifyRootPkgLock() {
  if (fs.existsSync(rootPackageLockPath)) {
    const rootPkgLockJson = await fs.readJson(rootPackageLockPath, 'utf8')
    // The @yarnpkg/extensions package is a zero dependency package, however it
    // includes @yarnpkg/core as peer dependency which npm happily installs as a
    // direct dependency. Later when check:tsc is run it will fail with errors
    // within the @types/emscripten package which is a transitive dependency of
    // @yarnpkg/core. We avoid this by removing the offending peerDependencies from
    // @yarnpkg/extensions and the package-lock.json file.
    const lockEntry =
      rootPkgLockJson.packages?.['node_modules/@yarnpkg/extensions']
    if (lockEntry?.peerDependencies) {
      // Properties with undefined values are omitted when saved as JSON.
      lockEntry.peerDependencies = undefined
      await fs.writeJson(rootPackageLockPath, rootPkgLockJson, { spaces: 2 })
      return true
    }
  }
  return false
}

async function modifyYarnpkgExtsPkgJson() {
  if (fs.existsSync(yarnPkgExtsJsonPath)) {
    // Load, normalize, and re-save node_modules/@yarnpkg/extensions/package.json
    // Normalization applies packageExtensions to fix @yarnpkg/extensions's package.json.
    const yarnPkgExtsJsonRaw = await fs.readJson(yarnPkgExtsJsonPath)
    if (yarnPkgExtsJsonRaw.peerDependencies) {
      await fs.writeJson(
        yarnPkgExtsJsonPath,
        normalizePackageJson(yarnPkgExtsJsonRaw),
        { spaces: 2 }
      )
      return true
    }
  }
  return false
}

;(async () => {
  try {
    // Surprisingly update-browserslist-db runs synchronously.
    updateBrowserslistDb()
  } catch (e) {
    if (e.name === 'BrowserslistUpdateError') {
      console.error(`update-browserslist-db: ${e.message}\n`)
    } else {
      throw e
    }
  }
  if (
    cliArgs.force ||
    (await modifyRootPkgLock()) ||
    (await modifyYarnpkgExtsPkgJson())
  ) {
    // Reinstall packages with the updated package-lock.json. (should be quick)
    await execNpm(['install'], { cwd: rootPath, stdio: 'inherit' })
  }
})()
