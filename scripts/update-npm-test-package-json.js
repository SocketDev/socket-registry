'use strict'

const path = require('node:path')
const util = require('node:util')

const { default: confirm } = require('@inquirer/confirm')
const fs = require('fs-extra')

const spawn = require('@npmcli/promise-spawn')
const { glob: tinyGlob } = require('tinyglobby')
const which = require('which')

const {
  NODE_MODULES,
  NODE_WORKSPACE,
  PACKAGE_HIDDEN_LOCK,
  PACKAGE_JSON,
  PACKAGE_LOCK,
  ignores,
  lifecycleScriptNames
} = require('@socketregistry/scripts/constants')
const { arrayChunk } = require('@socketregistry/scripts/utils/arrays')
const {
  isSymbolicLinkSync,
  readPackageJson
} = require('@socketregistry/scripts/utils/fs')
const {
  splitPath,
  trimTrailingSlash,
  trimLeadingDotSlash
} = require('@socketregistry/scripts/utils/path')
const {
  isNonEmptyString,
  localCompare
} = require('@socketregistry/scripts/utils/strings')

const rootPath = path.resolve(__dirname, '..')
const npmExecPath = which.sync('npm')
const npmPackagesPath = path.join(rootPath, 'packages/npm')
const testNpmPath = path.join(rootPath, 'test/npm')
const testNpmPkgJsonPath = path.join(testNpmPath, PACKAGE_JSON)
const testNpmPkgLockPath = path.join(testNpmPath, PACKAGE_LOCK)
const nmPath = path.join(testNpmPath, NODE_MODULES)
const relNmPath = trimLeadingDotSlash(path.relative(rootPath, nmPath))
const nmHiddenLockPath = path.join(nmPath, PACKAGE_HIDDEN_LOCK)
const workspacePath = path.join(testNpmPath, NODE_WORKSPACE)

const gitTagRefUrl = (user, repo, tag) =>
  `https://api.github.com/repos/${user}/${repo}/git/ref/tags/${tag}`

const tgzUrl = (user, repo, sha) =>
  `https://github.com/${user}/${repo}/archive/${sha}.tar.gz`

const getRepoUrlDetails = (repoUrl = '') => {
  const userAndRepo = repoUrl.replace(/^.+github.com\//, '').split('/')
  const { 0: user } = userAndRepo
  const repo =
    userAndRepo.length > 1 ? userAndRepo[1].slice(0, -'.git'.length) : ''
  return { user, repo }
}

const installTestNpmNodeModules = async pkgName => {
  const args = ['install', '--silent']
  if (typeof pkgName === 'string') {
    args.push('--save-dev', pkgName)
  }
  await fs.remove(testNpmPkgLockPath)
  await fs.remove(nmHiddenLockPath)
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
  const packageNames = (
    await tinyGlob(['*/'], {
      cwd: npmPackagesPath,
      onlyDirectories: true,
      expandDirectories: false
    })
  )
    .map(trimTrailingSlash)
    .sort(localCompare)
  const packageNameChunks = arrayChunk(packageNames, 3)

  // Populate lookup for isSocketRegistryPackage.
  for (const pkgName of packageNames) {
    socketRegistryPackageLookup.add(pkgName)
  }

  let initializeNodeModules = false
  let testNpmPkgJsonRaw = await fs.readJson(testNpmPkgJsonPath)

  // Remove workspaces before resolving packages.
  // We will add them back at the end.
  if (Array.isArray(testNpmPkgJsonRaw.workspaces)) {
    initializeNodeModules = true
    testNpmPkgJsonRaw.workspaces = undefined
    await fs.writeJson(testNpmPkgJsonPath, testNpmPkgJsonRaw, { spaces: 2 })
    testNpmPkgJsonRaw = await fs.readJson(testNpmPkgJsonPath)
  }
  if (fs.existsSync(workspacePath)) {
    initializeNodeModules = true
    await fs.move(workspacePath, nmPath, { overwrite: true })
  } else if (!fs.existsSync(nmPath)) {
    initializeNodeModules = true
  }

  // Initialize node_modules if missing or workspace config has changed.
  if (initializeNodeModules) {
    console.log(`✔ Initializing ${relNmPath}`)
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
        const nmPkgPath = path.join(nmPath, pkgName)
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

        const isTarball =
          !!testNpmPkgJsonRaw.devDependencies?.[pkgName]?.endsWith('.tar.gz')
        if (
          // We don't need to resolve the tarball if the devDependencies value
          // is already one.
          !isTarball &&
          // Search for the presence of test files anywhere in the package.
          (
            await tinyGlob(['**/test{s,}{.js,}', '**/*.{spec,test}.js'], {
              cwd: nmPkgPath,
              onlyFiles: false
            })
          ).length === 0
        ) {
          // When tests aren't included in the installed package we convert the
          // package version to a GitHub release tag, then we convert the release
          // tag to a sha, then finally we resolve the URL of the GitHub tarball
          // to use in place of the version range for its devDependencies entry.
          const nmPkgJson = await readCachedPackageJson(nmPkgPath)
          const { version: nmPkgVer } = nmPkgJson
          const { user, repo } = getRepoUrlDetails(nmPkgJson.repository?.url)
          let resolved = false
          if (user && repo) {
            // First try to resolve the sha for a tag starting with "v", e.g. v1.2.3.
            let tag = `v${nmPkgVer}`
            let apiUrl = gitTagRefUrl(user, repo, tag)
            let head = await fetch(apiUrl, { method: 'head' })
            if (!head.ok) {
              // If a sha isn't found, try again with the "v" removed, e.g. 1.2.3.
              tag = tag.slice(1)
              apiUrl = gitTagRefUrl(user, repo, tag)
              head = await fetch(apiUrl, { method: 'head' })
            }
            if (head.ok) {
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
                  repo,
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
    console.log(`✔ Updated ${relNmPath}. Reinstalling...`)
    try {
      await installTestNpmNodeModules()
      testNpmPkgJsonRaw = await fs.readJson(testNpmPkgJsonPath)
    } catch (e) {
      console.log('✘ Reinstall encountered an error:', e)
    }
  } else {
    console.log(`✔ Skipping reinstall of ${relNmPath}`)
  }

  for (const pkgNameChunk of packageNameChunks) {
    // Process 3 packages in parallel at a time.
    await Promise.all(
      pkgNameChunk.map(async pkgName => {
        const pkgPath = path.join(npmPackagesPath, pkgName)
        const nmPkgPath = path.join(nmPath, pkgName)
        const nmPkgJsonPath = path.join(nmPkgPath, PACKAGE_JSON)
        const nmPkgJson = await readCachedPackageJson(nmPkgJsonPath)
        const {
          dependencies: nmPkgDeps,
          overrides: nmPkgOverrides,
          resolutions: nmPkgResolutions
        } = nmPkgJson
        const pkgJson = await readPackageJson(pkgPath)

        // Cleanup package scripts
        const scripts = nmPkgJson.scripts ?? {}
        // Consolidate test script to script['test'].
        const scriptName =
          testScripts.find(n => isNonEmptyString(scripts[n])) ?? 'test'
        scripts.test = (scripts[scriptName] ?? '').replace(
          /^.*?(?=mocha|tape?)/,
          ''
        )
        // Remove lifecycle and test script variants.
        nmPkgJson.scripts = Object.fromEntries(
          Object.entries(scripts).filter(
            ({ 0: key }) =>
              key === 'test' ||
              !(
                key === 'lint' ||
                key === 'prelint' ||
                key === 'postlint' ||
                key === 'pretest' ||
                key === 'posttest' ||
                key.startsWith('test') ||
                lifecycleScriptNames.has(key)
              )
          )
        )

        const { dependencies, overrides } = pkgJson
        // Add dependencies of the @socketregistry/xyz package to the xyz package.
        if (dependencies) {
          if (nmPkgDeps) {
            Object.assign(nmPkgDeps, dependencies)
            if (overrides) {
              // Remove dependencies that exists in overrides to prevent an
              // install conflict error.
              nmPkgJson.dependencies = Object.fromEntries(
                Object.entries(nmPkgJson.dependencies).filter(({ 0: key }) => {
                  if (Object.hasOwn(overrides, key)) {
                    return false
                  }
                  return true
                })
              )
            }
          } else {
            nmPkgJson.dependencies = {
              ...dependencies
            }
          }
        }
        // Add overrides of the @socketregistry/xyz package to the xyz package.
        nmPkgJson.overrides = {
          ...nmPkgOverrides,
          ...overrides
        }
        nmPkgJson.resolutions = {
          ...nmPkgResolutions,
          ...overrides
        }
        // Symlink files from the @socketregistry/xyz package to the xyz package.
        const jsFiles = (
          await tinyGlob(['**/*.{js,json}'], {
            ignore: ['**/package.json'],
            cwd: pkgPath
          })
        ).sort(localCompare)
        const actions = new Map()
        for (const jsFile of jsFiles) {
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
  if (packageNames.length) {
    console.log('✔ Packages linked')
  }
  testNpmPkgJsonRaw.workspaces = packageNames.map(n => `${NODE_WORKSPACE}/${n}`)
  await fs.writeJson(testNpmPkgJsonPath, testNpmPkgJsonRaw, { spaces: 2 })

  console.log('✔ Installing workspace... (☕ break)')
  await fs.move(nmPath, workspacePath, { overwrite: true })
  // Remove unneeded workspace packages.
  await Promise.all(
    (
      await tinyGlob(['*/'], {
        cwd: workspacePath,
        onlyDirectories: true,
        expandDirectories: false
      })
    )
      .map(trimTrailingSlash)
      .filter(n => !isSocketRegistryPackage(n))
      .map(p => fs.remove(path.join(workspacePath, p)))
  )
  // Remove unneeded workspace directories/files.
  await Promise.all(
    (
      await tinyGlob(
        [
          '**/.*',
          '**/eslint.config.*',
          '**/karma.conf.js',
          '**/tsconfig.*',
          '**/tslint.*',
          '**/*.md',
          'example/',
          'CHANGE{LOG,S}{.*,}',
          'CONTRIBUTING{.*,}',
          'FUND{ING,}{.*,}',
          'README{.*,}',
          ...ignores
        ],
        {
          ignore: [`LICEN[CS]E{.*,}`],
          absolute: true,
          cwd: workspacePath,
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
