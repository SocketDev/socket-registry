'use strict'

const { existsSync, promises: fs, realpathSync } = require('node:fs')
const path = require('node:path')
const util = require('node:util')

const { move } = require('fs-extra')
const npmPackageArg = require('npm-package-arg')
const semver = require('semver')
const fastGlob = require('fast-glob')

const constants = require('@socketregistry/scripts/constants')
const {
  cleanTestScript,
  testScripts,
} = require('@socketregistry/scripts/lib/test-utils')
const { safeRemove } = require('@socketregistry/scripts/lib/safe-remove')
const { joinAnd } = require('@socketsecurity/registry/lib/arrays')
const { isSymLinkSync } = require('@socketsecurity/registry/lib/fs')
const { logger } = require('@socketsecurity/registry/lib/logger')
const { execNpm } = require('@socketsecurity/registry/lib/agent')
const { merge, objectEntries } = require('@socketsecurity/registry/lib/objects')
const {
  isGitHubTgzSpec,
  isGitHubUrlSpec,
  isSubpathExports,
  readPackageJson,
  resolveGitHubTgzUrl,
  resolveOriginalPackageName,
  resolvePackageJsonEntryExports,
} = require('@socketsecurity/registry/lib/packages')
const { pEach, pFilter } = require('@socketsecurity/registry/lib/promises')
const { isNonEmptyString } = require('@socketsecurity/registry/lib/strings')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const {
  COLUMN_LIMIT,
  DEFAULT_CONCURRENCY,
  LATEST,
  LICENSE_GLOB_RECURSIVE,
  NODE_MODULES_GLOB_RECURSIVE,
  PACKAGE_JSON,
  README_GLOB_RECURSIVE,
  SOCKET_REGISTRY_SCOPE,
  ignoreGlobs,
  lifecycleScriptNames,
  npmPackagesPath,
  relNpmPackagesPath,
  relTestNpmNodeModulesPath,
  relTestNpmPath,
  testNpmNodeModulesPath,
  testNpmNodeWorkspacesPath,
  testNpmPath,
  testNpmPkgJsonPath,
} = constants

const { values: cliArgs } = util.parseArgs(
  merge(constants.parseArgsConfig, {
    options: {
      add: {
        type: 'string',
        multiple: true,
      },
    },
  }),
)

const editablePackageJsonCache = new Map()

async function installAndMergePackage(pkgName, pkgVersion, options) {
  const { spinner } = { __proto__: null, ...options }
  // Check if there's a Socket override for this package.
  // Convert npm package name to Socket registry name (e.g., @hyrious/bun.lockb -> hyrious__bun.lockb).
  const socketPkgName = pkgName.startsWith('@')
    ? pkgName.slice(1).replace('/', '__')
    : pkgName
  const overridePkgPath = path.join(npmPackagesPath, socketPkgName)
  const hasOverride = existsSync(overridePkgPath)

  // Determine the final destination path.
  // Packages with Socket overrides go to test/npm/packages, others to test/npm/node_modules.
  const finalPath = hasOverride
    ? path.join(testNpmNodeWorkspacesPath, socketPkgName)
    : path.join(testNpmNodeModulesPath, pkgName)

  // Handle local file: dependencies differently.
  if (pkgVersion.startsWith('file:')) {
    // For local file dependencies, just copy them directly.
    const localPath = path.resolve(testNpmPath, pkgVersion.slice(5))
    if (existsSync(localPath)) {
      const { copy } = require('fs-extra')
      await copy(localPath, finalPath, { dereference: true })
      return
    }
  }

  try {
    // Use pnpm to install the package.
    spinner?.start(`Installing ${pkgName}@${pkgVersion}...`)

    // Install package to a temp location first.
    const tempPath = path.join(
      testNpmPath,
      `.tmp-${socketPkgName}-${Date.now()}`,
    )
    await fs.mkdir(tempPath, { recursive: true })

    // Create a minimal package.json in temp directory.
    await fs.writeFile(
      path.join(tempPath, 'package.json'),
      JSON.stringify({ name: 'temp-install', version: '1.0.0' }, null, 2),
    )

    // Prepare pnpm install command.
    const packageSpec = pkgVersion.startsWith('https://')
      ? pkgVersion
      : `${pkgName}@${pkgVersion}`

    // Use npm install to install the package (npm supports --no-save).
    await execNpm(['install', packageSpec, '--no-save'], {
      cwd: tempPath,
      stdio: cliArgs.quiet ? 'ignore' : 'inherit',
    })

    // Find the installed package path.
    const installedPkgPath = path.join(tempPath, 'node_modules', pkgName)

    if (hasOverride) {
      // Copy Socket override files on top of the installed package.
      spinner?.start(`Applying Socket overrides for ${pkgName}...`)
      const { copy } = require('fs-extra')

      // Save the original package.json scripts before overwriting.
      const originalPkgJsonPath = path.join(installedPkgPath, 'package.json')
      const originalPkgJson = await readPackageJson(originalPkgJsonPath, {
        normalize: true,
      })
      const originalScripts = originalPkgJson.scripts

      await copy(overridePkgPath, installedPkgPath, {
        overwrite: true,
        dereference: true,
        filter: src => {
          // Skip copying node_modules and .DS_Store files.
          return !src.includes('node_modules') && !src.endsWith('.DS_Store')
        },
      })

      // Merge back the test scripts if they existed.
      if (originalScripts) {
        const editablePkgJson = await readPackageJson(originalPkgJsonPath, {
          editable: true,
          normalize: true,
        })
        // Preserve test-related scripts from original package.
        const testScriptName =
          testScripts.find(n => isNonEmptyString(originalScripts[n])) ?? 'test'
        if (originalScripts[testScriptName]) {
          editablePkgJson.update({
            scripts: {
              ...editablePkgJson.content.scripts,
              test: cleanTestScript(originalScripts[testScriptName]),
            },
          })
          await editablePkgJson.save()
        }
      }
    }

    // Move the package to its final location.
    await safeRemove(finalPath)
    await move(installedPkgPath, finalPath, { overwrite: true })

    // Clean up temp directory.
    await safeRemove(tempPath)

    spinner?.stop()
  } catch (error) {
    // Clean up any temp directories on error.
    const tempPath = path.join(
      testNpmPath,
      `.tmp-${socketPkgName}-${Date.now()}`,
    )
    await safeRemove(tempPath)
    throw error
  }
}

async function installTestNpmNodeModules(options) {
  const { clean, specs, spinner } = { __proto__: null, ...options }
  const pathsToRemove = []
  if (clean) {
    // Clean node_modules directory.
    pathsToRemove.push(testNpmNodeModulesPath)
  }
  if (clean === 'deep') {
    const deepPaths = await fastGlob.glob([NODE_MODULES_GLOB_RECURSIVE], {
      absolute: true,
      cwd: testNpmNodeWorkspacesPath,
      onlyDirectories: true,
    })
    pathsToRemove.push(...deepPaths)
  }
  if (pathsToRemove.length) {
    await safeRemove(pathsToRemove)
  }

  // Get all devDependencies from test/npm/package.json.
  const testNpmPkgJson = await readPackageJson(testNpmPkgJsonPath, {
    normalize: true,
  })
  const { devDependencies } = testNpmPkgJson

  if (devDependencies) {
    // Ensure test/npm/node_modules exists.
    await fs.mkdir(testNpmNodeModulesPath, { recursive: true })

    // If specs are provided, only install those packages.
    const packagesToInstall = specs
      ? specs.map(spec => {
          // Handle scoped packages correctly (e.g., @hyrious/bun.lockb@version).
          const atIndex = spec.startsWith('@')
            ? spec.indexOf('@', 1)
            : spec.indexOf('@')
          const pkgName = atIndex === -1 ? spec : spec.slice(0, atIndex)
          const version =
            atIndex === -1
              ? devDependencies[pkgName] || 'latest'
              : spec.slice(atIndex + 1)
          return { name: pkgName, version: devDependencies[pkgName] || version }
        })
      : Object.entries(devDependencies).map(({ 0: name, 1: version }) => ({
          name,
          version,
        }))

    // Count packages with Socket overrides.
    const packagesWithOverrides = packagesToInstall.filter(({ name }) => {
      const socketPkgName = name.startsWith('@')
        ? name.slice(1).replace('/', '__')
        : name
      return existsSync(path.join(npmPackagesPath, socketPkgName))
    })

    if (!cliArgs.quiet) {
      spinner?.start(
        `Installing ${packagesToInstall.length} packages (${packagesWithOverrides.length} with Socket overrides)...`,
      )
    }

    // Install packages in parallel, but limit concurrency.
    await pEach(
      packagesToInstall,
      async ({ name, version }) => {
        // Check both possible locations for the package.
        const socketPkgName = name.startsWith('@')
          ? name.slice(1).replace('/', '__')
          : name
        const hasOverride = existsSync(
          path.join(npmPackagesPath, socketPkgName),
        )
        const existingPath = hasOverride
          ? path.join(testNpmNodeWorkspacesPath, socketPkgName)
          : path.join(testNpmNodeModulesPath, name)

        // Skip if package already exists and we're not forcing clean install.
        if (!clean && existsSync(existingPath)) {
          return
        }
        await installAndMergePackage(name, version, options)
      },
      { concurrency: DEFAULT_CONCURRENCY },
    )

    // After all packages are installed, update the package.json if specs were provided.
    if (specs && specs.length > 0) {
      const editablePkgJson = await readPackageJson(testNpmPkgJsonPath, {
        editable: true,
        normalize: true,
      })
      const newDevDeps = {}
      for (const spec of specs) {
        const pkgName = spec.split('@')[0]
        // Get the actual installed version.
        const installedPkgJsonPath = path.join(
          testNpmNodeModulesPath,
          pkgName,
          'package.json',
        )
        if (existsSync(installedPkgJsonPath)) {
          // eslint-disable-next-line no-await-in-loop
          const installedPkg = await readPackageJson(installedPkgJsonPath, {
            normalize: true,
          })
          newDevDeps[pkgName] = installedPkg.version
        }
      }
      editablePkgJson.update({
        devDependencies: {
          ...editablePkgJson.content.devDependencies,
          ...newDevDeps,
        },
      })
      await editablePkgJson.save()
    }
  }
}

async function installMissingPackages(packageNames, options) {
  const {
    devDependencies = (
      await readPackageJson(testNpmPkgJsonPath, { normalize: true })
    ).devDependencies,
    spinner,
  } = { __proto__: null, ...options }
  const originalNames = packageNames.map(resolveOriginalPackageName)
  const msg = `Refreshing ${originalNames.length} ${pluralize('package', originalNames.length)}...`
  const msgList = joinAnd(originalNames)
  spinner?.start(
    msg.length + msgList.length + 3 > COLUMN_LIMIT
      ? `${msg}:\n${msgList}`
      : `${msg} ${msgList}...`,
  )
  try {
    const newDeps = originalNames.filter(n => !devDependencies?.[n])
    if (newDeps.length) {
      await installTestNpmNodeModules({
        clean: true,
        specs: newDeps,
        spinner,
      })
    }
    const downloadDeps = originalNames.filter(
      n =>
        devDependencies?.[n] &&
        !existsSync(path.join(testNpmNodeModulesPath, n)),
    )
    if (downloadDeps.length) {
      // Install missing dependencies using installAndMergePackage.
      await pEach(
        downloadDeps,
        async n => {
          await installAndMergePackage(n, devDependencies[n], options)
        },
        { concurrency: DEFAULT_CONCURRENCY },
      )
    }
    if (cliArgs.quiet) {
      spinner?.stop()
    } else {
      spinner?.successAndStop(
        `Refreshed ${pluralize('package', originalNames.length)}`,
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

      // Check if this package has a Socket override.
      const socketPkgName = origPkgName.startsWith('@')
        ? origPkgName.slice(1).replace('/', '__')
        : origPkgName
      const hasOverride = existsSync(path.join(npmPackagesPath, socketPkgName))

      // Packages with overrides are in test/npm/packages, others in test/npm/node_modules.
      const nmPkgPath = hasOverride
        ? path.join(testNpmNodeWorkspacesPath, socketPkgName)
        : path.join(testNpmNodeModulesPath, origPkgName)

      const {
        content: { version: nmPkgVer },
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
            normalize: true,
          },
        )
        testNpmEditablePkgJson.update({
          devDependencies: {
            ...testNpmEditablePkgJson.content.devDependencies,
            [origPkgName]: gitHubTgzUrl,
          },
        })
        await testNpmEditablePkgJson.save()
        resolvable.push(origPkgName)
      } else {
        // Collect package names we failed to resolve tarballs for.
        unresolvable.push(origPkgName)
      }
      spinner?.stop()
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )
  if (resolvable.length) {
    spinner?.start(
      `Refreshing ${resolvable.join(', ')} from ${pluralize('tarball', resolvable.length)}...`,
    )
    try {
      await installTestNpmNodeModules({
        clean: true,
        specs: resolvable,
        spinner,
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
    normalize: true,
  })
  editablePackageJsonCache.set(filepath, result)
  return result
}

async function resolveDevDependencies(packageNames, options) {
  let { devDependencies } = await readPackageJson(testNpmPkgJsonPath, {
    normalize: true,
  })
  const missingPackages = packageNames.filter(sockRegPkgName => {
    const origPkgName = resolveOriginalPackageName(sockRegPkgName)
    // Missing packages can occur if the script is stopped part way through.
    // Check both node_modules and test/npm/packages locations.
    const hasOverride = existsSync(path.join(npmPackagesPath, sockRegPkgName))
    const pkgPath = hasOverride
      ? path.join(testNpmNodeWorkspacesPath, sockRegPkgName)
      : path.join(testNpmNodeModulesPath, origPkgName)
    return !devDependencies?.[origPkgName] || !existsSync(pkgPath)
  })
  if (missingPackages.length) {
    await installMissingPackages(missingPackages, {
      ...options,
      devDependencies,
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
        testNpmNodeModulesPath,
      )
      const isTarball = isGitHubTgzSpec(parsedSpec)
      const isGithubUrl = isGitHubUrlSpec(parsedSpec)

      // Check if this package has a Socket override.
      const hasOverride = existsSync(path.join(npmPackagesPath, sockRegPkgName))
      const pkgPath = hasOverride
        ? path.join(testNpmNodeWorkspacesPath, sockRegPkgName)
        : path.join(testNpmNodeModulesPath, origPkgName)

      return (
        // We don't need to resolve the tarball URL if the devDependencies
        // value is already one.
        !isTarball &&
        // We'll convert the easier to read GitHub URL with a #tag into the tarball URL.
        (isGithubUrl ||
          // Search for the presence of test files anywhere in the package.
          // The glob pattern ".{[cm],}[jt]s" matches .js, .cjs, .cts, .mjs, .mts, .ts file extensions.
          (
            await fastGlob.glob(
              [
                'test{s,}/*',
                '**/test{s,}{.{[cm],}[jt]s,}',
                '**/*.{spec,test}{.{[cm],}[jt]s}',
              ],
              {
                cwd: pkgPath,
                onlyFiles: false,
              },
            )
          ).length === 0)
      )
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )
  if (missingPackageTests.length) {
    await installMissingPackageTests(missingPackageTests, options)
  }
}

async function linkPackages(packageNames, options) {
  // Process and cleanup package.json scripts of test/npm/node_modules packages.
  // With the new approach, Socket overrides are already applied during installation.
  const { spinner } = { __proto__: null, ...options }
  spinner?.start('Processing packages...')

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

    // Check if the package exists in test/npm/node_modules.
    if (!existsSync(nmPkgPath)) {
      // Package doesn't exist, skip it.
      return
    }

    // Check if it's already a symlink to test/npm/packages (already processed).
    if (isSymLinkSync(nmPkgPath)) {
      const realPath = realpathSync.native(nmPkgPath)
      if (realPath === path.join(testNpmNodeWorkspacesPath, sockRegPkgName)) {
        // Already processed and linked.
        return
      }
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
                ),
            )
            .map(pair => {
              const { 0: key, 1: value } = pair
              if (key.startsWith('test')) {
                pair[1] = cleanTestScript(value)
              }
              return pair
            }),
        ),
      },
      { concurrency: DEFAULT_CONCURRENCY },
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
          }),
        )
      nmEditablePkgJson.update({
        dependencies: {
          ...nmPkgDeps,
          ...dependencies,
          ...overridesAsDeps,
        },
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
        constants.maintainedNodeVersions.last,
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
          ...entryExports,
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
            default: nodeEntryExportsDefault ?? nmNodeEntryExportsDefault,
          },
          // Properties with undefined values are omitted when saved as JSON.
          browser: undefined,
          module: undefined,
          require: undefined,
          // The "default" entry must be defined last.
          default: entryExportsDefault ?? nmEntryExportsDefault,
        }
      }
      nmEditablePkgJson.update({
        ...(updatedEntryExports ? { main: undefined } : {}),
        exports: updatedEntryExports,
      })
    }

    // Socket overrides are already applied during package installation.
    // Just save the updated package.json.
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
  // test/npm/node_modules to test/npm/packages
  const { spinner } = { __proto__: null, ...options }
  spinner?.start(`Cleaning up ${relTestNpmPath} workspaces...`)

  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    linkedPackageNames,
    async n => {
      const srcPath = path.join(
        testNpmNodeModulesPath,
        resolveOriginalPackageName(n),
      )
      const destPath = path.join(testNpmNodeWorkspacesPath, n)
      // Remove unnecessary directories/files.
      const unnecessaryPaths = await fastGlob.glob(
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
          ...ignoreGlobs,
        ],
        {
          ignore: [LICENSE_GLOB_RECURSIVE],
          absolute: true,
          caseSensitiveMatch: false,
          cwd: srcPath,
          dot: true,
          onlyFiles: false,
        },
      )
      if (unnecessaryPaths.length) {
        // Fallback to fs.rm if trash fails (e.g., for .github directories on macOS).
        await safeRemove(unnecessaryPaths, { spinner })
      }
      // Move override package from test/npm/node_modules to test/npm/packages
      await move(srcPath, destPath, { overwrite: true })
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )
  spinner?.stop()
  if (!cliArgs.quiet) {
    logger.log('🧽 Workspaces cleaned (so fresh and so clean, clean)')
  }
}

async function installNodeWorkspaces(options) {
  const { spinner } = { __proto__: null, ...options }
  spinner?.start(`🔨 Installing ${relTestNpmPath} workspaces... (☕ break)`)
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
  spinner.start(`📦 Initializing ${relTestNpmNodeModulesPath}...`)
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
