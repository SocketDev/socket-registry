'use strict'

const Module = require('node:module')
// Available in Node v22.8.0.
// https://nodejs.org/docs/latest/api/module.html#moduleenablecompilecachecachedir
if (typeof Module.enableCompileCache === 'function') {
  Module.enableCompileCache()
}
const path = require('node:path')
const util = require('node:util')

const { joinAsList } = require('@socketsecurity/registry/lib/arrays')
const fs = require('fs-extra')
const npmPackageArg = require('npm-package-arg')
const semver = require('semver')
const { glob: tinyGlob } = require('tinyglobby')

const constants = require('@socketregistry/scripts/constants')
const {
  COLUMN_LIMIT,
  LICENSE_GLOB_RECURSIVE,
  NODE_MODULES_GLOB_RECURSIVE,
  PACKAGE_JSON,
  PACKAGE_SCOPE,
  README_GLOB,
  lifecycleScriptNames,
  npmPackagesPath,
  parseArgsConfig,
  relNpmPackagesPath,
  relTestNpmNodeModulesPath,
  relTestNpmPath,
  testNpmNodeModulesPath,
  testNpmNodeWorkspacesPath,
  testNpmPath,
  testNpmPkgJsonPath,
  testNpmPkgLockPath
} = constants
const { Spinner } = require('@socketregistry/scripts/lib/spinner')
const {
  isSymbolicLinkSync,
  remove,
  uniqueSync
} = require('@socketsecurity/registry/lib/fs')
const { execNpm } = require('@socketsecurity/registry/lib/npm')
const { merge } = require('@socketsecurity/registry/lib/objects')
const {
  isSubpathExports,
  readPackageJson,
  resolveGitHubTgzUrl,
  resolveOriginalPackageName,
  resolvePackageJsonEntryExports
} = require('@socketsecurity/registry/lib/packages')
const { splitPath } = require('@socketsecurity/registry/lib/path')
const { pEach, pFilter } = require('@socketsecurity/registry/lib/promises')
const { isNonEmptyString } = require('@socketsecurity/registry/lib/strings')

const { values: cliArgs } = util.parseArgs(
  merge(parseArgsConfig, {
    options: {
      add: {
        type: 'string',
        multiple: true
      }
    }
  })
)

const testScripts = [
  // Order is significant. First in, first tried.
  'mocha',
  'specs',
  'tests-only',
  'test:readable-stream-only',
  'test'
]

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

async function installTestNpmNodeModules(options) {
  const { clean, specs } = { __proto__: null, ...options }
  await Promise.all([
    ...(clean ? [remove(testNpmPkgLockPath)] : []),
    ...(clean ? [remove(testNpmNodeModulesPath)] : []),
    ...(clean === 'deep'
      ? (
          await tinyGlob([NODE_MODULES_GLOB_RECURSIVE], {
            absolute: true,
            cwd: testNpmNodeWorkspacesPath,
            onlyDirectories: true
          })
        ).map(p => remove(p))
      : [])
  ])
  const args = ['install', '--silent']
  if (Array.isArray(specs)) {
    args.push('--save-dev', ...specs)
  }
  return await execNpm(args, { cwd: testNpmPath })
}

const editablePackageJsonCache = new Map()

const readCachedEditablePackageJson = async filepath_ => {
  const filepath = filepath_.endsWith(PACKAGE_JSON)
    ? filepath_
    : path.join(filepath_, PACKAGE_JSON)
  const cached = editablePackageJsonCache.get(filepath)
  if (cached) return cached
  const result = await readPackageJson(filepath, { editable: true })
  editablePackageJsonCache.set(filepath, result)
  return result
}

async function installMissingPackages(packageNames) {
  const originalNames = packageNames.map(resolveOriginalPackageName)
  const msg = `Refreshing ${originalNames.length} package${originalNames.length > 1 ? 's' : ''}...`
  const msgList = joinAsList(originalNames)
  const spinner = new Spinner(
    msg.length + msgList.length + 3 > COLUMN_LIMIT
      ? `${msg}:\n${msgList}`
      : `${msg} ${msgList}...`
  ).start()
  await Promise.all(
    originalNames.map(n => remove(path.join(testNpmNodeModulesPath, n)))
  )
  try {
    await installTestNpmNodeModules({ clean: true, specs: originalNames })
    if (cliArgs.quiet) {
      spinner.stop()
    } else {
      spinner.stop(`✔ Refreshed package${originalNames.length > 1 ? 's' : ''}`)
    }
  } catch {
    spinner.stop('✘ Failed to refresh packages')
  }
}

async function installMissingPackageTests(packageNames) {
  const originalNames = packageNames.map(resolveOriginalPackageName)
  const resolvable = []
  const unresolvable = []
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(originalNames, 3, async origPkgName => {
    // When tests aren't included in the installed package we convert the
    // package version to a GitHub release tag, then we convert the release
    // tag to a sha, then finally we resolve the URL of the GitHub tarball
    // to use in place of the version range for its devDependencies entry.
    const nmPkgPath = path.join(testNpmNodeModulesPath, origPkgName)
    const {
      content: { version: nmPkgVer }
    } = await readCachedEditablePackageJson(nmPkgPath)
    const pkgId = `${origPkgName}@${nmPkgVer}`
    const spinner = new Spinner(
      `Resolving GitHub tarball URL for ${pkgId}...`
    ).start()
    const gitHubTgzUrl = await resolveGitHubTgzUrl(pkgId, nmPkgPath)
    if (gitHubTgzUrl) {
      // Replace the dev dep version range with the tarball URL.
      const testNpmEditablePkgJson = await readPackageJson(testNpmPkgJsonPath, {
        editable: true
      })
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
    spinner.stop()
  })
  if (resolvable.length) {
    const spinner = new Spinner(
      `Refreshing ${resolvable.join(', ')} from tarball${resolvable.length > 1 ? 's' : ''}...`
    ).start()
    try {
      await installTestNpmNodeModules({ clean: true, specs: resolvable })
      if (cliArgs.quiet) {
        spinner.stop()
      } else {
        spinner.stop('✔ Refreshed packages from tarball')
      }
    } catch {
      spinner.stop('✘ Failed to refresh packages from tarball')
    }
  }
  if (unresolvable.length) {
    const msg = `⚠️ Unable to resolve tests for ${unresolvable.length} package${unresolvable.length > 1 ? 's' : ''}:`
    const msgList = joinAsList(unresolvable)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.log(`${msg}${separator}${msgList}`)
  }
}

async function resolveDevDependencies(packageNames) {
  let { devDependencies } = await readPackageJson(testNpmPkgJsonPath)
  const missingPackages = packageNames.filter(regPkgName => {
    const origPkgName = resolveOriginalPackageName(regPkgName)
    // Missing packages can occur if the script is stopped part way through
    return (
      typeof devDependencies?.[origPkgName] !== 'string' ||
      !fs.existsSync(path.join(testNpmNodeModulesPath, origPkgName))
    )
  })
  if (missingPackages.length) {
    await installMissingPackages(missingPackages)
  }
  ;({ devDependencies } = await readPackageJson(testNpmPkgJsonPath))
  // Chunk package names to process them in parallel 3 at a time.
  const missingPackageTests = await pFilter(
    packageNames,
    3,
    async regPkgName => {
      const origPkgName = resolveOriginalPackageName(regPkgName)
      const parsedSpec = npmPackageArg.resolve(
        origPkgName,
        devDependencies[origPkgName],
        testNpmNodeModulesPath
      )
      const isTarball =
        parsedSpec.type === 'remote' &&
        !!parsedSpec.saveSpec?.endsWith('.tar.gz')
      const isGithubUrl =
        parsedSpec.type === 'git' &&
        parsedSpec.hosted?.domain === 'github.com' &&
        isNonEmptyString(parsedSpec.gitCommittish)
      return (
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
    }
  )
  if (missingPackageTests.length) {
    await installMissingPackageTests(missingPackageTests)
  }
}

async function linkPackages(packageNames) {
  // Link files and cleanup package.json scripts of test/npm/node_modules packages.
  const linkedPackageNames = []
  const spinner = new Spinner(`Linking packages...`).start()
  let logCount = 0
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(packageNames, 3, async regPkgName => {
    const origPkgName = resolveOriginalPackageName(regPkgName)
    const pkgPath = path.join(npmPackagesPath, regPkgName)
    if (!fs.existsSync(pkgPath)) {
      logCount += 1
      console.log(`⚠️ ${regPkgName}: Missing from ${relNpmPackagesPath}`)
      return
    }
    const nmPkgPath = path.join(testNpmNodeModulesPath, origPkgName)
    if (isSymbolicLinkSync(nmPkgPath)) {
      if (
        fs.realpathSync(nmPkgPath) ===
        path.join(testNpmNodeWorkspacesPath, regPkgName)
      ) {
        return
      }
    }

    const nmEditablePkgJson = await readCachedEditablePackageJson(nmPkgPath)
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

    const { dependencies, engines, overrides } = pkgJson
    const entryExports = resolvePackageJsonEntryExports(pkgJson.exports)
    const entryExportsHasDotKeys = isSubpathExports(entryExports)

    // Add dependencies and overrides of the @socketregistry/xyz package
    // as dependencies of the test/npm/node_modules/xyz package.
    if (dependencies ?? overrides) {
      const socketRegistryPrefix = `npm:${PACKAGE_SCOPE}/`
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

    // Update test/npm/node_modules/xyz package engines field.
    const nodeRange = engines?.node
    if (
      nodeRange &&
      // Lazily access constants.maintainedNodeVersions.
      semver.gt(
        semver.coerce(nodeRange),
        constants.maintainedNodeVersions.previous
      )
    ) {
      // Replace engines field if the @socketregistry/xyz's engines.node range
      // is greater than the previous Node version.
      nmEditablePkgJson.update({ engines })
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
      logCount += 1
      spinner.message = `⚠️ ${origPkgName}: Module type mismatch`
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
              await remove(destPath)
              await fs.outputFile(
                destPath,
                createStubEsModule(uniquePath),
                'utf8'
              )
              return
            }
          } else {
            logCount += 1
            console.log(`✘ ${origPkgName}: Cannot convert ESM to CJS`)
          }
        }
        await remove(destPath)
        await fs.ensureSymlink(targetPath, destPath)
      })
    }
    // Chunk actions to process them in parallel 3 at a time.
    await pEach([...actions.values()], 3, a => a())
    await nmEditablePkgJson.save()
    linkedPackageNames.push(regPkgName)
  })
  if (cliArgs.quiet) {
    spinner.stop()
  } else if (logCount) {
    spinner.stop('✔ Packages linked')
  }
  return linkedPackageNames
}

async function cleanupNodeWorkspaces(linkedPackageNames) {
  // Cleanup up override packages and move them from
  // test/npm/node_modules/ to test/npm/node_workspaces/
  const spinner = new Spinner(
    `Cleaning up ${relTestNpmPath} workspaces...`
  ).start()
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(linkedPackageNames, 3, async n => {
    const srcPath = path.join(
      testNpmNodeModulesPath,
      resolveOriginalPackageName(n)
    )
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
            '**/.idea',
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
      ).map(p => remove(p))
    )
    // Move override package from test/npm/node_modules/ to test/npm/node_workspaces/
    await fs.move(srcPath, destPath, { overwrite: true })
  })
  if (cliArgs.quiet) {
    spinner.stop()
  } else {
    spinner.stop('✔ Workspaces cleaned (so fresh and so clean, clean)')
  }
}

async function installNodeWorkspaces() {
  const spinner = new Spinner(
    `Installing ${relTestNpmPath} workspaces... (☕ break)`
  ).start()
  // Finally install workspaces.
  try {
    await installTestNpmNodeModules({ clean: 'deep' })
    spinner.stop()
  } catch (e) {
    spinner.stop('✘ Installation encountered an error:', e)
  }
}

;(async () => {
  const nodeModulesExists = fs.existsSync(testNpmNodeModulesPath)
  const nodeWorkspacesExists = fs.existsSync(testNpmNodeWorkspacesPath)
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
  if (!nodeModulesExists) {
    // Refresh/initialize test/npm/node_modules
    const spinner = new Spinner(
      `Initializing ${relTestNpmNodeModulesPath}...`
    ).start()
    try {
      await installTestNpmNodeModules()
      if (cliArgs.quiet) {
        spinner.stop()
      } else {
        spinner.stop(`✔ Initialized ${relTestNpmNodeModulesPath}`)
      }
    } catch (e) {
      spinner.stop(`✘ Initialization encountered an error:`, e)
    }
  }
  const packageNames = addingPkgNames
    ? cliArgs.add
    : // Lazily access constants.npmPackageNames.
      constants.npmPackageNames
  await resolveDevDependencies(packageNames)
  const linkedPackageNames = packageNames.length
    ? await linkPackages(packageNames)
    : []
  if (linkedPackageNames.length) {
    await cleanupNodeWorkspaces(linkedPackageNames)
    await installNodeWorkspaces()
  }
  if (!cliArgs.quiet) {
    console.log('Finished 🎉')
  }
})()
