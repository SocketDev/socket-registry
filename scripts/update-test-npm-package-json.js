'use strict'

const { existsSync, promises: fs, realpathSync } = require('node:fs')
const path = require('node:path')
const util = require('node:util')

const { ensureSymlink, move, outputFile } = require('fs-extra')
const npmPackageArg = require('npm-package-arg')
const semver = require('semver')
const { glob } = require('fast-glob')
const trash = require('trash')

const constants = require('@socketregistry/scripts/constants')
const { joinAnd } = require('@socketsecurity/registry/lib/arrays')
const { isSymLinkSync, uniqueSync } = require('@socketsecurity/registry/lib/fs')
const { logger } = require('@socketsecurity/registry/lib/logger')
const { execPnpm } = require('@socketsecurity/registry/lib/agent')
const { merge, objectEntries } = require('@socketsecurity/registry/lib/objects')
const {
  extractPackage,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
  isSubpathExports,
  readPackageJson,
  resolveGitHubTgzUrl,
  resolveOriginalPackageName,
  resolvePackageJsonEntryExports
} = require('@socketsecurity/registry/lib/packages')
const { splitPath } = require('@socketsecurity/registry/lib/path')
const { pEach, pFilter } = require('@socketsecurity/registry/lib/promises')
const { isNonEmptyString } = require('@socketsecurity/registry/lib/strings')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const {
  COLUMN_LIMIT,
  LATEST,
  LICENSE_GLOB_RECURSIVE,
  NODE_MODULES_GLOB_RECURSIVE,
  PACKAGE_JSON,
  README_GLOB_RECURSIVE,
  SOCKET_REGISTRY_SCOPE,
  UTF8,
  ignoreGlobs,
  lifecycleScriptNames,
  npmPackagesPath,
  relNpmPackagesPath,
  relTestNpmNodeModulesPath,
  relTestNpmPath,
  testNpmNodeModulesPath,
  testNpmNodeWorkspacesPath,
  testNpmPath,
  testNpmPkgJsonPath
} = constants

const { values: cliArgs } = util.parseArgs(
  merge(constants.parseArgsConfig, {
    options: {
      add: {
        type: 'string',
        multiple: true
      }
    }
  })
)

const editablePackageJsonCache = new Map()

const testScripts = [
  // Order is significant. First in, first tried.
  'mocha',
  'specs',
  'test:source',
  'tests-only',
  'test:readable-stream-only',
  'test'
]

/**
 * Safely remove files/directories using trash, with fallback to fs.rm.
 * @param {string|string[]} paths - Path(s) to remove
 * @param {object} options - Options for fs.rm fallback
 * @returns {Promise<void>}
 */
async function safeRemove(paths, options = {}) {
  const pathArray = Array.isArray(paths) ? paths : [paths]
  if (pathArray.length === 0) {
    return
  }

  try {
    await trash(pathArray)
  } catch {
    // If trash fails, fallback to fs.rm.
    const { concurrency = 3, ...rmOptions } = options
    const defaultRmOptions = { force: true, recursive: true, ...rmOptions }

    await pEach(
      pathArray,
      async p => {
        try {
          await fs.rm(p, defaultRmOptions)
        } catch (rmError) {
          // Only warn about non-ENOENT errors if a spinner is provided.
          if (rmError.code !== 'ENOENT' && options.spinner) {
            options.spinner.warn(`Failed to remove ${p}: ${rmError.message}`)
          }
        }
      },
      { concurrency }
    )
  }
}

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
  return `export * from '${relPath}'\nexport { default, default as 'module.exports' } from '${relPath}'\n`
}

async function installTestNpmNodeModules(options) {
  const { clean, specs } = { __proto__: null, ...options }
  const pathsToRemove = []
  if (clean) {
    // Only clean node_modules, not lockfiles since we use pnpm now.
    pathsToRemove.push(testNpmNodeModulesPath)
  }
  if (clean === 'deep') {
    const deepPaths = await glob([NODE_MODULES_GLOB_RECURSIVE], {
      absolute: true,
      cwd: testNpmNodeWorkspacesPath,
      onlyDirectories: true
    })
    pathsToRemove.push(...deepPaths)
  }
  if (pathsToRemove.length) {
    await safeRemove(pathsToRemove)
  }
  // Use pnpm since test/npm is now a pnpm workspace.
  // In CI, we want to see pnpm errors if they occur.
  const stdio = constants.ENV.CI ? 'inherit' : 'ignore'
  return await execPnpm(
    [
      'install',
      '--ignore-scripts',
      // CI environments freeze lockfiles by default, but we need to update it here.
      ...(constants.ENV.CI ? ['--no-frozen-lockfile'] : []),
      ...(Array.isArray(specs) ? ['--save-dev', '--save-exact', ...specs] : [])
    ],
    { cwd: testNpmPath, stdio }
  )
}

async function installMissingPackages(packageNames, options) {
  const {
    devDependencies = (
      await readPackageJson(testNpmPkgJsonPath, { normalize: true })
    ).devDependencies,
    spinner
  } = { __proto__: null, ...options }
  const originalNames = packageNames.map(resolveOriginalPackageName)
  const msg = `Refreshing ${originalNames.length} ${pluralize('package', originalNames.length)}...`
  const msgList = joinAnd(originalNames)
  spinner?.start(
    msg.length + msgList.length + 3 > COLUMN_LIMIT
      ? `${msg}:\n${msgList}`
      : `${msg} ${msgList}...`
  )
  try {
    const newDeps = originalNames.filter(n => !devDependencies?.[n])
    if (newDeps.length) {
      await installTestNpmNodeModules({
        clean: true,
        specs: newDeps,
        spinner
      })
    }
    const downloadDeps = originalNames.filter(
      n =>
        devDependencies?.[n] &&
        !existsSync(path.join(testNpmNodeModulesPath, n))
    )
    if (downloadDeps.length) {
      // Chunk dependencies to download and process them in parallel 3 at a time.
      await pEach(
        downloadDeps,
        async n => {
          const nmPkgPath = path.join(testNpmNodeModulesPath, n)
          // Broken symlinks are treated an non-existent by fs.existsSync, however
          // they will cause fs.mkdir to throw an ENOENT error, so we remove any
          // existing file beforehand just in case.
          await safeRemove(nmPkgPath)
          await extractPackage(`${n}@${devDependencies[n]}`, {
            dest: nmPkgPath
          })
        },
        { concurrency: 3 }
      )
    }
    if (cliArgs.quiet) {
      spinner?.stop()
    } else {
      spinner?.successAndStop(
        `Refreshed ${pluralize('package', originalNames.length)}`
      )
    }
  } catch {
    spinner?.errorAndStop('Failed to refresh packages')
  }
}

async function installMissingPackageTests(packageNames, options) {
  const { spinner } = { __proto__: null, ...options }
  const originalNames = packageNames.map(resolveOriginalPackageName)
  const resolvable = []
  const unresolvable = []
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    originalNames,
    async origPkgName => {
      // When tests aren't included in the installed package we convert the
      // package version to a GitHub release tag, then we convert the release
      // tag to a sha, then finally we resolve the URL of the GitHub tarball
      // to use in place of the version range for its devDependencies entry.
      const nmPkgPath = path.join(testNpmNodeModulesPath, origPkgName)
      const {
        content: { version: nmPkgVer }
      } = await readCachedEditablePackageJson(nmPkgPath)
      const pkgId = `${origPkgName}@${nmPkgVer}`
      spinner?.start(`Resolving GitHub tarball URL for ${pkgId}...`)

      const gitHubTgzUrl = await resolveGitHubTgzUrl(pkgId, nmPkgPath)
      if (gitHubTgzUrl) {
        // Replace the dev dep version range with the tarball URL.
        const testNpmEditablePkgJson = await readPackageJson(
          testNpmPkgJsonPath,
          {
            editable: true,
            normalize: true
          }
        )
        testNpmEditablePkgJson.update({
          devDependencies: {
            ...testNpmEditablePkgJson.content.devDependencies,
            [origPkgName]: gitHubTgzUrl
          }
        })
        await testNpmEditablePkgJson.save()
        resolvable.push(origPkgName)
      } else {
        // Collect package names we failed to resolve tarballs for.
        unresolvable.push(origPkgName)
      }
      spinner?.stop()
    },
    { concurrency: 3 }
  )
  if (resolvable.length) {
    spinner?.start(
      `Refreshing ${resolvable.join(', ')} from ${pluralize('tarball', resolvable.length)}...`
    )
    try {
      await installTestNpmNodeModules({
        clean: true,
        specs: resolvable,
        spinner
      })
      if (cliArgs.quiet) {
        spinner?.stop()
      } else {
        spinner?.successAndStop('Refreshed packages from tarball')
      }
    } catch {
      spinner?.errorAndStop('Failed to refresh packages from tarball')
    }
  }
  if (unresolvable.length) {
    const msg = `Unable to resolve tests for ${unresolvable.length} ${pluralize('package', unresolvable.length)}:`
    const msgList = joinAnd(unresolvable)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    spinner?.warn(`${msg}${separator}${msgList}`)
  }
}

async function readCachedEditablePackageJson(filepath_) {
  const filepath = filepath_.endsWith(PACKAGE_JSON)
    ? filepath_
    : path.join(filepath_, PACKAGE_JSON)
  const cached = editablePackageJsonCache.get(filepath)
  if (cached) {
    return cached
  }
  const result = await readPackageJson(filepath, {
    editable: true,
    normalize: true
  })
  editablePackageJsonCache.set(filepath, result)
  return result
}

async function resolveDevDependencies(packageNames, options) {
  let { devDependencies } = await readPackageJson(testNpmPkgJsonPath, {
    normalize: true
  })
  const missingPackages = packageNames.filter(sockRegPkgName => {
    const origPkgName = resolveOriginalPackageName(sockRegPkgName)
    // Missing packages can occur if the script is stopped part way through
    return (
      !devDependencies?.[origPkgName] ||
      !existsSync(path.join(testNpmNodeModulesPath, origPkgName))
    )
  })
  if (missingPackages.length) {
    await installMissingPackages(missingPackages, {
      ...options,
      devDependencies
    })
    // Refresh devDependencies object.
    devDependencies = (
      await readPackageJson(testNpmPkgJsonPath, { normalize: true })
    ).devDependencies
  }
  // Chunk package names to process them in parallel 3 at a time.
  const missingPackageTests = await pFilter(
    packageNames,
    async sockRegPkgName => {
      const origPkgName = resolveOriginalPackageName(sockRegPkgName)
      const parsedSpec = npmPackageArg.resolve(
        origPkgName,
        devDependencies?.[origPkgName] ?? LATEST,
        testNpmNodeModulesPath
      )
      const isTarball = isGitHubTgzSpec(parsedSpec)
      const isGithubUrl = isGitHubUrlSpec(parsedSpec)
      return (
        // We don't need to resolve the tarball URL if the devDependencies
        // value is already one.
        !isTarball &&
        // We'll convert the easier to read GitHub URL with a #tag into the tarball URL.
        (isGithubUrl ||
          // Search for the presence of test files anywhere in the package.
          // The glob pattern ".{[cm],}[jt]s" matches .js, .cjs, .cts, .mjs, .mts, .ts file extensions.
          (
            await glob(
              [
                'test{s,}/*',
                '**/test{s,}{.{[cm],}[jt]s,}',
                '**/*.{spec,test}{.{[cm],}[jt]s}'
              ],
              {
                cwd: path.join(testNpmNodeModulesPath, origPkgName),
                onlyFiles: false
              }
            )
          ).length === 0)
      )
    },
    { concurrency: 3 }
  )
  if (missingPackageTests.length) {
    await installMissingPackageTests(missingPackageTests, options)
  }
}

async function linkPackages(packageNames, options) {
  // Link files and cleanup package.json scripts of test/npm/node_modules packages.
  const { spinner } = { __proto__: null, ...options }
  spinner?.start('Linking packages...')

  const linkedPackageNames = []
  let issueCount = 0
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(packageNames, async sockRegPkgName => {
    const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
    if (!existsSync(pkgPath)) {
      issueCount += 1
      spinner?.warn(`${sockRegPkgName}: Missing from ${relNpmPackagesPath}`)
      return
    }
    const origPkgName = resolveOriginalPackageName(sockRegPkgName)
    const nmPkgPath = path.join(testNpmNodeModulesPath, origPkgName)
    if (isSymLinkSync(nmPkgPath)) {
      if (
        realpathSync(nmPkgPath) ===
        path.join(testNpmNodeWorkspacesPath, sockRegPkgName)
      ) {
        return
      }
      // If it's a symlink but pointing to the wrong location, remove it.
      await safeRemove(nmPkgPath)
    }

    const nmEditablePkgJson = await readCachedEditablePackageJson(nmPkgPath)
    const { dependencies: nmPkgDeps } = nmEditablePkgJson.content
    const pkgJson = await readPackageJson(pkgPath, { normalize: true })

    // Cleanup package scripts
    const scripts = nmEditablePkgJson.content.scripts ?? {}
    // Consolidate test script to script['test'].
    const testScriptName =
      testScripts.find(n => isNonEmptyString(scripts[n])) ?? 'test'
    scripts.test = scripts[testScriptName] ?? ''
    // Remove lifecycle and test script variants.
    nmEditablePkgJson.update(
      {
        scripts: Object.fromEntries(
          objectEntries(scripts)
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
                  key.startsWith('test:browsers') ||
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
      },
      { concurrency: 3 }
    )

    const { dependencies, engines, overrides } = pkgJson
    const entryExports = resolvePackageJsonEntryExports(pkgJson.exports)
    const entryExportsHasDotKeys = isSubpathExports(entryExports)

    // Add dependencies and overrides of the @socketregistry/xyz package
    // as dependencies of the test/npm/node_modules/xyz package.
    if (dependencies ?? overrides) {
      const socketRegistryPrefix = `npm:${SOCKET_REGISTRY_SCOPE}/`
      const overridesAsDeps =
        overrides &&
        Object.fromEntries(
          objectEntries(overrides).map(pair => {
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

    // Update test/npm/node_modules/xyz package engines field.
    const nodeRange = engines?.node
    if (
      nodeRange &&
      semver.gt(
        // Roughly check Node range as semver.coerce will strip leading
        // v's, carets (^), comparators (<,<=,>,>=,=), and tildes (~).
        semver.coerce(nodeRange),
        constants.maintainedNodeVersions.last
      )
    ) {
      // Replace engines field if the @socketregistry/xyz's engines.node range
      // is greater than the previous Node version.
      nmEditablePkgJson.update({ engines: { ...engines } })
    } else {
      // Remove engines field.
      // Properties with undefined values are omitted when saved as JSON.
      nmEditablePkgJson.update({ engines: undefined })
    }

    // Update test/npm/node_modules/xyz package exports field.
    if (entryExports) {
      const { default: entryExportsDefault, ...entryExportsWithoutDefault } =
        entryExports

      const nmEntryExports =
        resolvePackageJsonEntryExports(nmEditablePkgJson.content.exports) ?? {}

      const nmEntryExportsHasDotKeys = isSubpathExports(nmEntryExports)

      const {
        default: nmEntryExportsDefault,
        ...nmEntryExportsWithoutDefault
      } = nmEntryExports

      const {
        default: nodeEntryExportsDefault,
        ...nodeEntryExportsWithoutDefault
      } = (!entryExportsHasDotKeys && entryExports.node) || {}

      const {
        default: nmNodeEntryExportsDefault,
        ...nmNodeEntryExportsWithoutDefault
      } = (!nmEntryExportsHasDotKeys && nmEntryExports.node) || {}

      let updatedEntryExports
      if (entryExportsHasDotKeys) {
        updatedEntryExports = {
          __proto__: null,
          // Cannot contain some keys starting with '.' and some not.
          // The exports object must either be an object of package subpath
          // keys OR an object of main entry condition name keys only.
          ...(nmEntryExportsHasDotKeys ? nmEntryExports : {}),
          ...entryExports
        }
      } else {
        updatedEntryExports = {
          __proto__: null,
          // The "types" entry should be defined first.
          types: undefined,
          // Cannot contain some keys starting with '.' and some not.
          // The exports object must either be an object of package subpath
          // keys OR an object of main entry condition name keys only.
          ...(nmEntryExportsHasDotKeys ? {} : nmEntryExportsWithoutDefault),
          ...entryExportsWithoutDefault,
          node: {
            __proto__: null,
            ...nmNodeEntryExportsWithoutDefault,
            ...nodeEntryExportsWithoutDefault,
            // Properties with undefined values are omitted when saved as JSON.
            module: undefined,
            require: undefined,
            // The "default" entry must be defined last.
            default: nodeEntryExportsDefault ?? nmNodeEntryExportsDefault
          },
          // Properties with undefined values are omitted when saved as JSON.
          browser: undefined,
          module: undefined,
          require: undefined,
          // The "default" entry must be defined last.
          default: entryExportsDefault ?? nmEntryExportsDefault
        }
      }
      nmEditablePkgJson.update({
        ...(updatedEntryExports ? { main: undefined } : {}),
        exports: updatedEntryExports
      })
    }

    // Symlink files from the @socketregistry/xyz override package to the
    // test/npm/node_modules/xyz package.
    const isPkgTypeModule = pkgJson.type === 'module'
    const isNmPkgTypeModule = nmEditablePkgJson.content.type === 'module'
    const isModuleTypeMismatch = isNmPkgTypeModule !== isPkgTypeModule
    if (isModuleTypeMismatch) {
      issueCount += 1
      spinner?.warn(`${origPkgName}: Module type mismatch`)
    }
    const actions = new Map()
    for (const jsFile of await glob(['**/*.{cjs,js,json}'], {
      ignore: ['**/node_modules', '**/package.json'],
      cwd: pkgPath
    })) {
      let targetPath = path.join(pkgPath, jsFile)
      let destPath = path.join(nmPkgPath, jsFile)
      const dirs = splitPath(path.dirname(jsFile))
      for (let i = 0, { length } = dirs; i < length; i += 1) {
        const crumbs = dirs.slice(0, i + 1)
        const destPathDir = path.join(nmPkgPath, ...crumbs)
        if (!existsSync(destPathDir) || isSymLinkSync(destPathDir)) {
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
              await safeRemove(destPath)
              await outputFile(destPath, createStubEsModule(uniquePath), UTF8)
              return
            }
          } else {
            issueCount += 1
            spinner?.error(`${origPkgName}: Cannot convert ESM to CJS`)
          }
        }
        // Remove any existing file/symlink at the destination.
        await safeRemove(destPath)
        try {
          await ensureSymlink(targetPath, destPath)
        } catch (symlinkError) {
          // If symlink creation fails, check if file exists and try once more.
          if (symlinkError.code === 'EEXIST') {
            await safeRemove(destPath)
            await ensureSymlink(targetPath, destPath)
          } else {
            throw symlinkError
          }
        }
      })
    }
    // Chunk actions to process them in parallel 3 at a time.
    await pEach([...actions.values()], a => a(), { concurrency: 3 })
    await nmEditablePkgJson.save()
    linkedPackageNames.push(sockRegPkgName)
  })
  if (!issueCount || cliArgs.quiet) {
    spinner?.stop()
  } else if (issueCount) {
    spinner?.successAndStop('Packages linked')
  }
  return linkedPackageNames
}

async function cleanupNodeWorkspaces(linkedPackageNames, options) {
  // Cleanup up override packages and move them from
  // test/npm/node_modules/ to test/npm/node_workspaces/
  const { spinner } = { __proto__: null, ...options }
  spinner?.start(`Cleaning up ${relTestNpmPath} workspaces...`)

  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    linkedPackageNames,
    async n => {
      const srcPath = path.join(
        testNpmNodeModulesPath,
        resolveOriginalPackageName(n)
      )
      const destPath = path.join(testNpmNodeWorkspacesPath, n)
      // Remove unnecessary directories/files.
      const unnecessaryPaths = await glob(
        [
          '**/.editorconfig',
          '**/.eslintignore',
          '**/.eslintrc.json',
          '**/.gitattributes',
          '**/.github',
          '**/.idea',
          '**/.nvmrc',
          '**/.travis.yml',
          '**/*.md',
          '**/tslint.json',
          '**/doc{s,}/',
          '**/example{s,}/',
          '**/CHANGE{LOG,S}{.*,}',
          '**/CONTRIBUTING{.*,}',
          '**/FUND{ING,}{.*,}',
          README_GLOB_RECURSIVE,
          ...ignoreGlobs
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
      if (unnecessaryPaths.length) {
        // Fallback to fs.rm if trash fails (e.g., for .github directories on macOS).
        await safeRemove(unnecessaryPaths, { spinner })
      }
      // Move override package from test/npm/node_modules/ to test/npm/node_workspaces/
      await move(srcPath, destPath, { overwrite: true })
    },
    { concurrency: 3 }
  )
  if (cliArgs.quiet) {
    spinner?.stop()
  } else {
    spinner?.successAndStop('Workspaces cleaned (so fresh and so clean, clean)')
  }
}

async function installNodeWorkspaces(options) {
  const { spinner } = { __proto__: null, ...options }
  spinner?.start(`Installing ${relTestNpmPath} workspaces... (☕ break)`)
  // Finally install workspaces.
  try {
    await installTestNpmNodeModules({ clean: 'deep', spinner })
    spinner?.stop()
  } catch (e) {
    spinner?.errorAndStop('Installation encountered an error:', e)
  }
}

void (async () => {
  const nodeModulesExists = existsSync(testNpmNodeModulesPath)
  const nodeWorkspacesExists = existsSync(testNpmNodeWorkspacesPath)
  const addingPkgNames =
    nodeModulesExists && nodeWorkspacesExists && Array.isArray(cliArgs.add)
  // Exit early if nothing to do.
  if (
    nodeModulesExists &&
    nodeWorkspacesExists &&
    !(cliArgs.force || addingPkgNames)
  ) {
    return
  }
  const { spinner } = constants
  spinner.start(`Initializing ${relTestNpmNodeModulesPath}...`)
  // Refresh/initialize test/npm/node_modules
  try {
    await safeRemove(testNpmNodeWorkspacesPath)
    await installTestNpmNodeModules({ clean: true, spinner })
    if (!cliArgs.quiet) {
      spinner.success(`Initialized ${relTestNpmNodeModulesPath}`)
    }
  } catch (e) {
    spinner.errorAndStop('Initialization encountered an error:', e)
    return
  }
  const packageNames = addingPkgNames ? cliArgs.add : constants.npmPackageNames
  await resolveDevDependencies(packageNames, { spinner })
  const linkedPackageNames = packageNames.length
    ? await linkPackages(packageNames, { spinner })
    : []
  if (linkedPackageNames.length) {
    await cleanupNodeWorkspaces(linkedPackageNames, { spinner })
    await installNodeWorkspaces({ spinner })
  }
  spinner.stop()
  if (!cliArgs.quiet) {
    logger.log('Finished 🎉')
  }
})()
