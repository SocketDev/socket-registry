'use strict'

const path = require('node:path')
const util = require('node:util')

const spawn = require('@npmcli/promise-spawn')
const fs = require('fs-extra')
const npmPackageArg = require('npm-package-arg')
const semver = require('semver')
const { glob: tinyGlob } = require('tinyglobby')

const constants = require('@socketregistry/scripts/constants')
const {
  LICENSE_GLOB_RECURSIVE,
  NODE_WORKSPACES,
  PACKAGE_JSON,
  README_GLOB,
  lifecycleScriptNames,
  npmPackagesPath,
  relNpmPackagesPath,
  relTestNpmNodeModulesPath,
  relTestNpmPath,
  testNpmNodeModulesHiddenLockPath,
  testNpmNodeModulesPath,
  testNpmNodeWorkspacesPath,
  testNpmPath,
  testNpmPkgJsonPath,
  testNpmPkgLockPath
} = constants
const {
  arrayChunk,
  arrayUnique
} = require('@socketregistry/scripts/utils/arrays')
const {
  isSymbolicLinkSync,
  uniqueSync
} = require('@socketregistry/scripts/utils/fs')
const {
  readPackageJson,
  resolveGitHubTgzUrl
} = require('@socketregistry/scripts/utils/packages')
const { splitPath } = require('@socketregistry/scripts/utils/path')
const { pEach, pEachChunk } = require('@socketregistry/scripts/utils/promises')
const { localCompare } = require('@socketregistry/scripts/utils/sorts')
const { Spinner } = require('@socketregistry/scripts/utils/spinner')
const { isNonEmptyString } = require('@socketregistry/scripts/utils/strings')

const { values: cliArgs } = util.parseArgs({
  options: {
    add: {
      type: 'string',
      multiple: true
    },
    force: {
      type: 'boolean',
      short: 'f'
    }
  }
})

function cleanTestScript(testScript) {
  return (
    testScript
      // Strip actions BEFORE and AFTER the test runner is invoked.
      .replace(
        /^.*?(\b(?:ava|jest|node|npm run|mocha|tape?)\b.*?)(?:&.+|$)/,
        '$1'
      )
      // Remove unsupported Node flag "--es-staging"
      .replace(/(?<=node)(?: +--[-\w]+)+/, m =>
        m.replaceAll(' --es-staging', '')
      )
      .trim()
  )
}

function createStubEsModule(srcPath) {
  const relPath = `./${path.basename(srcPath)}`
  return `export * from '${relPath}'\nexport { default } from '${relPath}'\n`
}

async function installTestNpmNodeModules(pkgName) {
  await Promise.all([
    fs.remove(testNpmPkgLockPath),
    fs.remove(testNpmNodeModulesHiddenLockPath)
  ])
  const args = ['install', '--silent']
  if (typeof pkgName === 'string') {
    args.push('--save-dev', pkgName)
  }
  // Lazily access constants.npmExecPath.
  return await spawn(constants.npmExecPath, args, { cwd: testNpmPath })
}

const editablePackageJsonCache = { __proto__: null }
const readCachedEditablePackageJson = async filepath_ => {
  const filepath = filepath_.endsWith(PACKAGE_JSON)
    ? filepath_
    : path.join(filepath_, PACKAGE_JSON)
  const cached = editablePackageJsonCache[filepath]
  if (cached) return cached
  const result = await readPackageJson(filepath, { editable: true })
  editablePackageJsonCache[filepath] = result
  return result
}

const toWorkspaceEntry = pkgName => `${NODE_WORKSPACES}/${pkgName}`

const testScripts = [
  // Order is significant. First in, first tried.
  'mocha',
  'specs',
  'tests-only',
  'test:readable-stream-only',
  'test'
]

;(async () => {
  const nodeModulesExists = fs.existsSync(testNpmNodeModulesPath)
  const nodeWorkspacesExists = fs.existsSync(testNpmNodeWorkspacesPath)
  const requiredDirsExist = nodeModulesExists && nodeWorkspacesExists
  const addingPkgNames = requiredDirsExist ? cliArgs.add : undefined

  // Exit early if nothing to do.
  if (requiredDirsExist && !(cliArgs.force || Array.isArray(addingPkgNames))) {
    return
  }

  // Lazily access constants.npmPackageNames.
  const packageNames = addingPkgNames ?? constants.npmPackageNames
  // Chunk package names to process them in parallel 3 at a time.
  const packageNameChunks = addingPkgNames
    ? arrayChunk(addingPkgNames, 3)
    : arrayChunk(constants.npmPackageNames, 3)

  let modifiedTestNpmPkgJson = false
  let testNpmEditablePkgJson = await readPackageJson(testNpmPkgJsonPath, {
    editable: true
  })

  // Refresh/initialize test/npm/node_modules
  {
    const spinner = new Spinner(
      `${nodeModulesExists ? 'Refreshing' : 'Initializing'} ${relTestNpmNodeModulesPath}...`
    ).start()
    if (nodeModulesExists) {
      // Remove existing packages to re-install later.
      await Promise.all(
        packageNames.map(n => fs.remove(path.join(testNpmNodeModulesPath, n)))
      )
    }
    try {
      await installTestNpmNodeModules()
      testNpmEditablePkgJson = await readPackageJson(testNpmPkgJsonPath, {
        editable: true
      })
      spinner.stop(
        `✔ ${nodeModulesExists ? 'Refreshed' : 'Initialized'} ${relTestNpmNodeModulesPath}`
      )
    } catch (e) {
      spinner.stop(
        `✘ ${nodeModulesExists ? 'Refresh' : 'Initialization'} encountered an error:`,
        e
      )
    }
  }

  // Resolve test/npm/package.json "devDependencies" data.
  {
    const unresolved = []
    await pEachChunk(packageNameChunks, async pkgName => {
      const devDepExists =
        typeof testNpmEditablePkgJson.content.devDependencies?.[pkgName] ===
        'string'
      const nmPkgPath = path.join(testNpmNodeModulesPath, pkgName)
      const nmPkgPathExists = fs.existsSync(nmPkgPath)
      // Missing packages can occur if the script is stopped part way through
      if (!devDepExists || !nmPkgPathExists) {
        // A package we expect to be there is missing or corrupt. Install it.
        if (nmPkgPathExists) {
          await fs.remove(nmPkgPath)
        }
        const spinner = new Spinner(
          `${devDepExists ? 'Refreshing' : 'Adding'} ${pkgName}...`
        ).start()
        try {
          await installTestNpmNodeModules(pkgName)
          testNpmEditablePkgJson = await readPackageJson(testNpmPkgJsonPath, {
            editable: true
          })
          spinner.stop(
            devDepExists
              ? `✔ Refreshed ${pkgName}`
              : `✔ --save-dev ${pkgName} to package.json`
          )
        } catch {
          spinner.stop(
            devDepExists
              ? `✘ Failed to reinstall ${pkgName}`
              : `✘ Failed to --save-dev ${pkgName} to package.json`
          )
        }
      }
      const pkgSpec = testNpmEditablePkgJson.content.devDependencies?.[pkgName]
      const parsedSpec = npmPackageArg.resolve(
        pkgName,
        pkgSpec,
        testNpmNodeModulesPath
      )
      const isTarball =
        parsedSpec.type === 'remote' &&
        !!parsedSpec.saveSpec?.endsWith('.tar.gz')
      const isGithubUrl =
        parsedSpec.type === 'git' &&
        parsedSpec.hosted?.domain === 'github.com' &&
        isNonEmptyString(parsedSpec.gitCommittish)
      if (
        // We don't need to resolve the tarball URL if the devDependencies
        // value is already one.
        !isTarball &&
        // We'll convert the easier to read GitHub URL with a #tag into the tarball URL.
        (isGithubUrl ||
          // Search for the presence of test files anywhere in the package.
          // The glob pattern ".{[cm],}[jt]s" matches .js, .cjs, .cts, .mjs, .mts, .ts file extensions.
          (
            await tinyGlob(
              [
                '**/test{s,}{.{[cm],}[jt]s,}',
                '**/*.{spec,test}{.{[cm],}[jt]s}'
              ],
              {
                cwd: nmPkgPath,
                onlyFiles: false
              }
            )
          ).length === 0)
      ) {
        // When tests aren't included in the installed package we convert the
        // package version to a GitHub release tag, then we convert the release
        // tag to a sha, then finally we resolve the URL of the GitHub tarball
        // to use in place of the version range for its devDependencies entry.
        const nmEditablePkgJson = await readCachedEditablePackageJson(nmPkgPath)
        const { version: nmPkgVer } = nmEditablePkgJson.content
        const pkgId = `${pkgName}@${nmPkgVer}`
        const spinner = new Spinner(
          `Resolving GitHub tarball URL for ${pkgId}...`
        ).start()
        const gitHubTgzUrl = await resolveGitHubTgzUrl(pkgId, nmPkgPath)
        if (gitHubTgzUrl) {
          // Replace the dev dep version range with the tarball URL.
          modifiedTestNpmPkgJson = true
          testNpmEditablePkgJson.update({
            devDependencies: {
              ...testNpmEditablePkgJson.content.devDependencies,
              [pkgName]: gitHubTgzUrl
            }
          })
        } else {
          // Collect the names and versions of packages we failed to resolve
          // tarballs for.
          unresolved.push({ name: pkgName, version: nmPkgVer })
        }
        spinner.stop()
      }
    })
    if (unresolved.length) {
      const msg = '⚠️ Unable to resolve tests for the following packages:'
      const unresolvedNames = unresolved.map(u => u.name)
      const unresolvedList =
        unresolvedNames.length === 1
          ? unresolvedNames[0]
          : `${unresolvedNames.slice(0, -1).join(', ')} and ${unresolvedNames.at(-1)}`
      const separator = msg.length + unresolvedList.length > 80 ? '\n' : ' '
      console.log(`${msg}${separator}${unresolvedList}`)
    }
  }

  // Update test/npm/node_modules if the test/npm/package.json "devDependencies"
  // field was modified.
  if (modifiedTestNpmPkgJson) {
    await testNpmEditablePkgJson.save()
    const spinner = new Spinner(
      `Updating ${relTestNpmNodeModulesPath}...`
    ).start()
    try {
      await installTestNpmNodeModules()
      testNpmEditablePkgJson = await readPackageJson(testNpmPkgJsonPath, {
        editable: true
      })
      spinner.stop(`✔ Updated ${relTestNpmNodeModulesPath}`)
    } catch (e) {
      spinner.stop('✘ Update encountered an error:', e)
    }
  }

  // Link files and cleanup package.json scripts of test/npm/node_modules packages.
  if (packageNameChunks.length) {
    const spinner = new Spinner(`Linking packages...`).start()
    await pEachChunk(packageNameChunks, async pkgName => {
      const pkgPath = path.join(npmPackagesPath, pkgName)
      if (!fs.existsSync(pkgPath)) {
        console.log(`⚠️ ${pkgName}: Missing from ${relNpmPackagesPath}`)
        return
      }
      const nmPkgPath = path.join(testNpmNodeModulesPath, pkgName)
      const nmPkgJsonPath = path.join(nmPkgPath, PACKAGE_JSON)
      const nmEditablePkgJson =
        await readCachedEditablePackageJson(nmPkgJsonPath)
      const { dependencies: nmPkgDeps } = nmEditablePkgJson.content
      const pkgJson = await readPackageJson(pkgPath)

      // Cleanup package scripts
      const scripts = nmEditablePkgJson.content.scripts ?? {}
      // Consolidate test script to script['test'].
      const testScriptName =
        testScripts.find(n => isNonEmptyString(scripts[n])) ?? 'test'
      scripts.test = scripts[testScriptName] ?? ''
      // Remove lifecycle and test script variants.
      nmEditablePkgJson.update({
        scripts: Object.fromEntries(
          Object.entries(scripts)
            .filter(
              ({ 0: key }) =>
                key === 'test' ||
                !(
                  key === testScriptName ||
                  key === 'lint' ||
                  key === 'prelint' ||
                  key === 'postlint' ||
                  key === 'pretest' ||
                  key === 'posttest' ||
                  lifecycleScriptNames.has(key)
                )
            )
            .map(pair => {
              const { 0: key, 1: value } = pair
              if (key.startsWith('test')) {
                pair[1] = cleanTestScript(value)
              }
              return pair
            })
        )
      })

      // Add dependencies and overrides of @socketregistry/xyz override package
      // as dependencies of the original xyz package.
      const { dependencies, engines, overrides } = pkgJson
      if (dependencies ?? overrides) {
        const socketRegistryPrefix = 'npm:@socketregistry/'
        const overridesAsDeps =
          overrides &&
          Object.fromEntries(
            Object.entries(overrides).map(pair => {
              const { 1: value } = pair
              if (value.startsWith(socketRegistryPrefix)) {
                pair[1] = `file:../${value.slice(socketRegistryPrefix.length, value.lastIndexOf('@'))}`
              }
              return pair
            })
          )
        nmEditablePkgJson.update({
          dependencies: {
            ...nmPkgDeps,
            ...dependencies,
            ...overridesAsDeps
          }
        })
      }

      const nodeRange = engines?.node
      if (
        nodeRange &&
        // Lazily access constants.maintainedNodeVersions.
        semver.gt(
          semver.coerce(nodeRange),
          constants.maintainedNodeVersions.get('previous')
        )
      ) {
        // Replace engines field if the @socketregistry/xyz's engines.node range
        // is greater than the previous Node version.
        nmEditablePkgJson.update({ engines })
      } else {
        // Remove engines field. The `undefined` value will be removed when saved.
        nmEditablePkgJson.update({ engines: undefined })
      }

      // Symlink files from the @socketregistry/xyz override package to the
      // original xyz package.
      const isPkgTypeModule = pkgJson.type === 'module'
      const isNmPkgTypeModule = nmEditablePkgJson.content.type === 'module'
      const isModuleTypeMismatch = isNmPkgTypeModule !== isPkgTypeModule
      if (isModuleTypeMismatch) {
        spinner.message = `⚠️ ${pkgName}: Module type mismatch`
      }
      const actions = new Map()
      for (const jsFile of await tinyGlob(['**/*.{cjs,js,json}'], {
        ignore: ['**/package.json'],
        cwd: pkgPath
      })) {
        let targetPath = path.join(pkgPath, jsFile)
        let destPath = path.join(nmPkgPath, jsFile)
        const dirs = splitPath(path.dirname(jsFile))
        for (let i = 0, { length } = dirs; i < length; i += 1) {
          const crumbs = dirs.slice(0, i + 1)
          const destPathDir = path.join(nmPkgPath, ...crumbs)
          if (!fs.existsSync(destPathDir) || isSymbolicLinkSync(destPathDir)) {
            targetPath = path.join(pkgPath, ...crumbs)
            destPath = destPathDir
            break
          }
        }
        actions.set(destPath, async () => {
          if (isModuleTypeMismatch) {
            const destExt = path.extname(destPath)
            if (isNmPkgTypeModule && !isPkgTypeModule) {
              if (destExt === '.js') {
                // We can go from CJS by creating an ESM stub.
                const uniquePath = uniqueSync(`${destPath.slice(0, -3)}.cjs`)
                await fs.copyFile(targetPath, uniquePath)
                await fs.remove(destPath)
                await fs.outputFile(
                  destPath,
                  createStubEsModule(uniquePath),
                  'utf8'
                )
                return
              }
            } else {
              console.log(`✘ ${pkgName}: Cannot convert ESM to CJS`)
            }
          }
          await fs.remove(destPath)
          await fs.ensureSymlink(targetPath, destPath)
        })
      }
      await pEach([...actions.values()], 3, a => a())
      await nmEditablePkgJson.save()
    })
    spinner.stop('✔ Packages linked')
  }

  // Tidy up override packages and move them from
  // test/npm/node_modules/ to test/npm/node_workspaces/
  {
    const spinner = new Spinner(
      `Tidying up ${relTestNpmPath} workspaces... (☕ break)`
    ).start()
    await pEachChunk(packageNameChunks, async n => {
      const srcPath = path.join(testNpmNodeModulesPath, n)
      const destPath = path.join(testNpmNodeWorkspacesPath, n)
      // Remove unnecessary directories/files.
      await Promise.all(
        (
          await tinyGlob(
            [
              '.package-lock.json',
              '**/.editorconfig',
              '**/.eslintignore',
              '**/.eslintrc.json',
              '**/.gitattributes',
              '**/.github',
              '**/.npmignore',
              '**/.npmrc',
              '**/.nvmrc',
              '**/.travis.yml',
              '**/*.md',
              '**/tslint.json',
              '**/doc{s,}/',
              '**/example{s,}/',
              '**/CHANGE{LOG,S}{.*,}',
              '**/CONTRIBUTING{.*,}',
              '**/FUND{ING,}{.*,}',
              `**/${README_GLOB}`,
              // Lazily access constants.ignoreGlobs.
              ...constants.ignoreGlobs
            ],
            {
              ignore: [LICENSE_GLOB_RECURSIVE],
              absolute: true,
              caseSensitiveMatch: false,
              cwd: srcPath,
              dot: true,
              onlyFiles: false
            }
          )
        ).map(p => fs.remove(p))
      )
      // Move override package from test/npm/node_modules/ to test/npm/node_workspaces/
      await fs.move(srcPath, destPath)
    })
    spinner.stop('✔ Workspaces cleaned (so fresh and so clean, clean)')
  }

  // Reinstall test/npm/node_modules.
  {
    const spinner = new Spinner(
      `Installing ${relTestNpmPath} workspaces... (☕ break)`
    ).start()
    // Update "workspaces" field in test/npm/package.json.
    const existingWorkspaces = testNpmEditablePkgJson.content.workspaces
    const workspaces = cliArgs.add
      ? arrayUnique([
          ...(Array.isArray(existingWorkspaces) ? existingWorkspaces : []),
          ...cliArgs.add.map(toWorkspaceEntry)
        ]).sort(localCompare)
      : // Lazily access constants.npmPackageNames.
        constants.npmPackageNames.map(toWorkspaceEntry)
    testNpmEditablePkgJson.update({ workspaces })
    await testNpmEditablePkgJson.save()
    // Finally install workspaces.
    try {
      await installTestNpmNodeModules()
      spinner.stop()
    } catch (e) {
      spinner.stop('✘ Installation encountered an error:', e)
    }
  }
  console.log('Finished 🎉')
})()
