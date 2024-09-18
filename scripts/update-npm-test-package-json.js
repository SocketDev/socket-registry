'use strict'

const path = require('node:path')
const { parseArgs } = require('node:util')

const spawn = require('@npmcli/promise-spawn')
const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const {
  LICENSE_GLOB_PATTERN,
  NODE_WORKSPACE,
  PACKAGE_JSON,
  README_GLOB_PATTERN,
  ignores,
  lifecycleScriptNames,
  npmExecPath,
  npmPackageNames,
  npmPackagesPath,
  testNpmNodeModulesHiddenLockPath,
  testNpmNodeModulesPath,
  testNpmNodeWorkspacePath,
  testNpmPath,
  testNpmPkgJsonPath,
  testNpmPkgLockPath
} = require('@socketregistry/scripts/constants')
const { arrayChunk } = require('@socketregistry/scripts/utils/arrays')
const {
  isSymbolicLinkSync,
  readDirNames,
  readPackageJson
} = require('@socketregistry/scripts/utils/fs')
const { parsePackageSpec } = require('@socketregistry/scripts/utils/packages')
const { splitPath } = require('@socketregistry/scripts/utils/path')
const { isNonEmptyString } = require('@socketregistry/scripts/utils/strings')

const { values: cliArgs } = parseArgs({
  options: {
    force: {
      type: 'boolean',
      short: 'f'
    }
  }
})

const cleanTestScript = testScript =>
  testScript
    // Strip actions BEFORE the test runner is invoked.
    .replace(/^.*?(?=\b(?:ava|jest|node|npm run|mocha|tape?)\b)/, '')
    // Remove unsupported Node flag "--es-staging"
    .replace(/(?<=node)(?: +--[-\w]+)+/, m => m.replaceAll(' --es-staging', ''))

const gitTagRefUrl = (user, project, tag) =>
  `https://api.github.com/repos/${user}/${project}/git/ref/tags/${tag}`

const tgzUrl = (user, project, sha) =>
  `https://github.com/${user}/${project}/archive/${sha}.tar.gz`

const getRepoUrlDetails = (repoUrl = '') => {
  const userAndRepo = repoUrl.replace(/^.+github.com\//, '').split('/')
  const { 0: user } = userAndRepo
  const project =
    userAndRepo.length > 1 ? userAndRepo[1].slice(0, -'.git'.length) : ''
  return { user, project }
}

const installTestNpmNodeModules = async pkgName => {
  const args = ['install', '--silent']
  if (typeof pkgName === 'string') {
    args.push('--save-dev', pkgName)
  }
  await fs.remove(testNpmPkgLockPath)
  await fs.remove(testNpmNodeModulesHiddenLockPath)
  return await spawn(npmExecPath, args, { cwd: testNpmPath })
}

const socketRegistryPackageLookup = new Set()
const isSocketRegistryPackage = pkgName =>
  socketRegistryPackageLookup.has(pkgName)

const packageJsonCache = { __proto__: null }
const readCachedPackageJson = async filepath_ => {
  const filepath = filepath_.endsWith(PACKAGE_JSON)
    ? filepath_
    : path.join(filepath_, PACKAGE_JSON)
  const cached = packageJsonCache[filepath]
  if (cached) return cached
  const result = await readPackageJson(filepath)
  packageJsonCache[filepath] = result
  return result
}

const testScripts = [
  // Order is significant. First in, first tried.
  'mocha',
  'specs',
  'tests-only',
  'test:readable-stream-only',
  'test'
]

;(async () => {
  const workspaceExists = fs.existsSync(testNpmNodeWorkspacePath)
  const nmExists = fs.existsSync(testNpmNodeModulesPath)

  // Exit early if nothing to do.
  if (workspaceExists && nmExists && !cliArgs.force) {
    return
  }

  const relTestNpmNodeModulesPath = path.relative(
    testNpmNodeModulesPath,
    testNpmPath
  )

  const packageNameChunks = arrayChunk(npmPackageNames, 3)

  // Populate lookup for isSocketRegistryPackage.
  for (const pkgName of npmPackageNames) {
    socketRegistryPackageLookup.add(pkgName)
  }

  let initializeNodeModules = false
  let testNpmPkgJsonRaw = await fs.readJson(testNpmPkgJsonPath)

  // Remove workspaces before resolving packages.
  // We will add them back at the end.
  if (Array.isArray(testNpmPkgJsonRaw.workspaces)) {
    initializeNodeModules = true
    // Properties with undefined values are omitted when saved as JSON.
    testNpmPkgJsonRaw.workspaces = undefined
    await fs.writeJson(testNpmPkgJsonPath, testNpmPkgJsonRaw, { spaces: 2 })
    testNpmPkgJsonRaw = await fs.readJson(testNpmPkgJsonPath)
  }

  initializeNodeModules = !nmExists
  if (workspaceExists) {
    // Avoid a symlink rabbit hole that ends up accidentally updating
    // packages/npm/**/package.json files.
    await fs.move(testNpmNodeWorkspacePath, testNpmNodeModulesPath, {
      overwrite: true
    })
    initializeNodeModules = true
  }

  // Initialize node_modules if missing or workspace config has changed.
  if (initializeNodeModules) {
    console.log(`✔ Initializing ${relTestNpmNodeModulesPath}`)
    try {
      await installTestNpmNodeModules()
      testNpmPkgJsonRaw = await fs.readJson(testNpmPkgJsonPath)
    } catch (e) {
      console.log('✘ Initialization encountered an error:', e)
    }
  }

  let modifiedTestNpmPkgJson = false
  const unresolved = []
  for (const pkgNameChunk of packageNameChunks) {
    // Process 3 packages in parallel at a time.
    await Promise.all(
      pkgNameChunk.map(async pkgName => {
        const devDepExists =
          typeof testNpmPkgJsonRaw.devDependencies?.[pkgName] === 'string'
        const nmPkgPath = path.join(testNpmNodeModulesPath, pkgName)
        const nmPkgPathExists = fs.existsSync(nmPkgPath)
        // Missing packages can occur if the script is stopped part way through
        if (!devDepExists || !nmPkgPathExists) {
          // A package we expect to be there is missing or corrupt. Reinstall it.
          if (nmPkgPathExists) {
            await fs.remove(nmPkgPath)
          }
          let msg = ''
          try {
            await installTestNpmNodeModules(pkgName)
            testNpmPkgJsonRaw = await fs.readJson(testNpmPkgJsonPath)
            msg = devDepExists
              ? `✔ Reinstalled ${pkgName}`
              : `✔ --save-dev ${pkgName} to package.json`
          } catch {
            msg = devDepExists
              ? `✘ Failed to reinstall ${pkgName}`
              : `✘ Failed to --save-dev ${pkgName} to package.json`
          }
          console.log(msg)
        }

        const pkgSpec = testNpmPkgJsonRaw.devDependencies?.[pkgName]
        const parsedSpec = parsePackageSpec(
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
          const nmPkgJson = await readCachedPackageJson(nmPkgPath)
          const { version: nmPkgVer } = nmPkgJson
          const { user, project } = isGithubUrl
            ? parsedSpec.hosted
            : getRepoUrlDetails(nmPkgJson.repository?.url)
          let resolved = false
          if (user && project) {
            let apiUrl = ''
            if (isGithubUrl) {
              apiUrl = gitTagRefUrl(user, project, parsedSpec.gitCommittish)
            } else {
              // First try to resolve the sha for a tag starting with "v", e.g. v1.2.3.
              apiUrl = gitTagRefUrl(user, project, `v${nmPkgVer}`)
              if (!(await fetch(apiUrl, { method: 'head' })).ok) {
                // If a sha isn't found, try again with the "v" removed, e.g. 1.2.3.
                apiUrl = gitTagRefUrl(user, project, nmPkgVer)
                if (!(await fetch(apiUrl, { method: 'head' })).ok) {
                  apiUrl = ''
                }
              }
            }
            if (apiUrl) {
              const resp = await fetch(apiUrl)
              const json = await resp.json()
              const sha = json?.object?.sha
              if (sha) {
                // Replace the dev dep version range with the tarball URL.
                resolved = true
                modifiedTestNpmPkgJson = true
                if (testNpmPkgJsonRaw.devDependencies === undefined) {
                  testNpmPkgJsonRaw.devDependencies = {}
                }
                testNpmPkgJsonRaw.devDependencies[pkgName] = tgzUrl(
                  user,
                  project,
                  sha
                )
              }
            }
          }
          if (!resolved) {
            // Collect the names and versions of packages we failed to resolve
            // tarballs for.
            unresolved.push({ name: pkgName, version: nmPkgVer })
            console.log(
              `✘ Failed to resolve GitHub tarball URL for ${pkgName}@${nmPkgVer}`
            )
          }
        }
      })
    )
  }

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

  if (modifiedTestNpmPkgJson) {
    await fs.writeJson(testNpmPkgJsonPath, testNpmPkgJsonRaw, { spaces: 2 })
    console.log(`✔ Updated ${relTestNpmNodeModulesPath}. Reinstalling...`)
    try {
      await installTestNpmNodeModules()
      testNpmPkgJsonRaw = await fs.readJson(testNpmPkgJsonPath)
    } catch (e) {
      console.log('✘ Reinstall encountered an error:', e)
    }
  } else {
    console.log(`✔ Skipping reinstall of ${relTestNpmNodeModulesPath}`)
  }

  for (const pkgNameChunk of packageNameChunks) {
    // Process 3 packages in parallel at a time.
    await Promise.all(
      pkgNameChunk.map(async pkgName => {
        const pkgPath = path.join(npmPackagesPath, pkgName)
        const nmPkgPath = path.join(testNpmNodeModulesPath, pkgName)
        const nmPkgJsonPath = path.join(nmPkgPath, PACKAGE_JSON)
        const nmPkgJson = await readCachedPackageJson(nmPkgJsonPath)
        const { dependencies: nmPkgDeps } = nmPkgJson
        const pkgJson = await readPackageJson(pkgPath)

        // Cleanup package scripts
        const scripts = nmPkgJson.scripts ?? {}
        // Consolidate test script to script['test'].
        const testScriptName =
          testScripts.find(n => isNonEmptyString(scripts[n])) ?? 'test'
        scripts.test = scripts[testScriptName] ?? ''
        // Remove lifecycle and test script variants.
        nmPkgJson.scripts = Object.fromEntries(
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

        // Add dependencies and overrides of @socketregistry/xyz as dependencies
        // of the xyz package.
        const { dependencies, overrides } = pkgJson
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
          nmPkgJson.dependencies = {
            ...nmPkgDeps,
            ...dependencies,
            ...overridesAsDeps
          }
        }

        // Add engines field of the @socketregistry/xyz package to the xyz package.
        // If the value is `undefined` it will be removed when written to disk.
        nmPkgJson.engines = pkgJson.engines

        // Symlink files from the @socketregistry/xyz package to the xyz package.
        const actions = new Map()
        for (const jsFile of await tinyGlob(['**/*.{js,json}'], {
          ignore: ['**/package.json'],
          cwd: pkgPath
        })) {
          let targetPath = path.join(pkgPath, jsFile)
          let destPath = path.join(nmPkgPath, jsFile)
          const dirs = splitPath(path.dirname(jsFile))
          for (let i = 0, { length } = dirs; i < length; i += 1) {
            const crumbs = dirs.slice(0, i + 1)
            const destPathDir = path.join(nmPkgPath, ...crumbs)
            if (
              !fs.existsSync(destPathDir) ||
              isSymbolicLinkSync(destPathDir)
            ) {
              targetPath = path.join(pkgPath, ...crumbs)
              destPath = destPathDir
              break
            }
          }
          actions.set(destPath, async () => {
            await fs.remove(destPath)
            await fs.ensureSymlink(targetPath, destPath)
          })
        }
        const actionChunks = arrayChunk([...actions.values()], 3)
        for (const chunk of actionChunks) {
          await Promise.all(chunk.map(a => a()))
        }
        await fs.writeJson(nmPkgJsonPath, nmPkgJson, { spaces: 2 })
      })
    )
  }
  if (npmPackageNames.length) {
    console.log('✔ Packages linked')
  }
  testNpmPkgJsonRaw.workspaces = npmPackageNames.map(
    n => `${NODE_WORKSPACE}/${n}`
  )
  await fs.writeJson(testNpmPkgJsonPath, testNpmPkgJsonRaw, { spaces: 2 })

  console.log('✔ Installing workspace... (☕ break)')
  await fs.move(testNpmNodeModulesPath, testNpmNodeWorkspacePath, {
    overwrite: true
  })
  // Remove unneeded workspace packages.
  await Promise.all(
    (await readDirNames(testNpmNodeWorkspacePath, { sort: false }))
      .filter(n => !isSocketRegistryPackage(n))
      .map(p => fs.remove(path.join(testNpmNodeWorkspacePath, p)))
  )
  // Remove unneeded workspace directories/files.
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
          `**/${README_GLOB_PATTERN}`,
          ...ignores
        ],
        {
          ignore: [`**/${LICENSE_GLOB_PATTERN}`],
          absolute: true,
          cwd: testNpmNodeWorkspacePath,
          dot: true,
          onlyFiles: false
        }
      )
    ).map(p => fs.remove(p))
  )
  try {
    await installTestNpmNodeModules()
  } catch (e) {
    console.log('✘ Finalization encountered an error:', e)
  }
  console.log('Finished 🎉')
})()
