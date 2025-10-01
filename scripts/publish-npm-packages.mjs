import path from 'node:path'

import semver from 'semver'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import { joinAnd } from '../registry/dist/lib/arrays.js'
import { logger } from '../registry/dist/lib/logger.js'
import { isObjectObject } from '../registry/dist/lib/objects.js'
import {
  fetchPackageManifest,
  getReleaseTag,
  readPackageJsonSync,
} from '../registry/dist/lib/packages.js'
import { pEach } from '../registry/dist/lib/promises.js'
import { spawn } from '../registry/dist/lib/spawn.js'
import { pluralize } from '../registry/dist/lib/words.js'

import { getChangedFiles } from '../registry/dist/lib/git.js'

import constants from './constants.mjs'

async function findVersionBumpCommits() {
  // Get git log with commit messages starting with "Bump".
  const result = await spawn('git', [
    'log',
    '--grep=^Bump',
    '--format=%H %s',
    'main',
  ])

  const commits = []
  const lines = result.stdout.trim().split('\n')

  for (const line of lines) {
    const match = /^([a-f0-9]+) (.+)$/.exec(line)
    if (!match) {
      continue
    }

    const sha = match[1]
    const message = match[2]

    // Skip non-package bump commits (like dependency bumps).
    // Accept "registry" or "registery" (typo), "packages", or "Bump to v" format.
    if (
      !message.includes('registry package') &&
      !message.includes('registery package') &&
      !message.includes('packages') &&
      !/^Bump to v/.test(message)
    ) {
      continue
    }

    // Get the registry package.json version at this commit.
    try {
      // eslint-disable-next-line no-await-in-loop
      const pkgJsonResult = await spawn('git', [
        'show',
        `${sha}:registry/package.json`,
      ])
      const pkgJson = JSON.parse(pkgJsonResult.stdout)
      commits.push({
        sha,
        version: pkgJson.version,
        message,
      })
    } catch {
      // Skip commits where registry/package.json doesn't exist or can't be parsed.
    }
  }

  // Reverse to get chronological order (oldest first).
  return commits.slice().toReversed()
}

async function getCurrentBranch() {
  const result = await spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  return result.stdout.trim()
}

async function getCommitSha(ref) {
  const result = await spawn('git', ['rev-parse', ref])
  return result.stdout.trim()
}

async function checkoutCommit(sha) {
  // Discard any uncommitted changes from previous builds.
  await spawn('git', ['reset', '--hard'])
  await spawn('git', ['checkout', sha])
}

const {
  COLUMN_LIMIT,
  LATEST,
  SOCKET_REGISTRY_SCOPE,
  npmPackagesPath,
  registryPkgPath,
} = constants

const { values: cliArgs } = parseArgs({
  options: {
    debug: {
      type: 'boolean',
    },
    force: {
      type: 'boolean',
      short: 'f',
    },
    quiet: {
      type: 'boolean',
    },
  },
  strict: false,
})

function packageData(data) {
  const {
    isTrustedPublisher = false,
    printName = data.name,
    tag = LATEST,
  } = data
  return Object.assign(data, { isTrustedPublisher, printName, tag })
}

async function ensureNpmVersion() {
  // Install npm first to ensure we have the latest version.
  logger.log('Installing npm@latest for trusted publishing...')
  await spawn('npm', ['install', '-g', 'npm@latest'])
  const result = await spawn('npm', ['--version'])
  const npmVersion = result.stdout.trim()
  logger.log(`npm version: ${npmVersion}`)

  // Verify npm version is >= 11.5.1 (required for trusted publishing).
  try {
    const semverResult = await spawn('npx', [
      '--yes',
      'semver',
      npmVersion,
      '-r',
      '>=11.5.1',
    ])
    if (semverResult.stdout.trim() === '') {
      throw new Error(
        `npm version ${npmVersion} does not meet the 11.5.1+ requirement for trusted publishing`,
      )
    }
  } catch (e) {
    logger.error(
      `npm version ${npmVersion} does not meet the 11.5.1+ requirement for trusted publishing`,
    )
    throw e
  }
}

async function publishTrusted(pkg, state, options) {
  const { maxRetries = 3, retryDelay = 1000 } = { __proto__: null, ...options }
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required.')
  }

  // Retry flow:
  // 1. Attempt publish with npm using OIDC trusted publishing.
  // 2. On success, exit immediately.
  // 3. On error, check if package already exists (cannot publish over) - if so, exit.
  // 4. On other errors, retry with exponential backoff: 1s, 2s, 4s delays.
  // 5. After maxRetries exhausted, add to fails list and log final error.
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      if (attempt > 0) {
        const delay = retryDelay * 2 ** (attempt - 1)
        logger.log(
          `${pkg.printName}: Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
        )
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Use npm for trusted publishing with OIDC tokens.
      // eslint-disable-next-line no-await-in-loop
      const result = await spawn('npm', ['publish', '--access', 'public'], {
        cwd: pkg.path,
        env: process.env,
        // Don't set NODE_AUTH_TOKEN for trusted publishing - uses OIDC.
      })
      if (result.stdout) {
        logger.log(result.stdout)
      }
      // Success - exit retry loop.
      return
    } catch (e) {
      lastError = e
      const stderr = e?.stderr ?? ''
      // Don't retry if package already exists.
      if (stderr.includes('cannot publish over')) {
        return
      }
      // Log the error but continue retrying.
      if (stderr && attempt < maxRetries - 1) {
        logger.warn(`${pkg.printName}: Publish attempt ${attempt + 1} failed`)
      }
    }
  }

  // All retries exhausted.
  state.fails.push(pkg.printName)
  const stderr = lastError?.stderr ?? ''
  if (stderr) {
    logger.log(stderr)
  }
}

async function publishToken(pkg, state, options) {
  const { maxRetries = 3, retryDelay = 1000 } = { __proto__: null, ...options }
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required.')
  }

  // Retry flow:
  // 1. Attempt publish with pnpm using NODE_AUTH_TOKEN.
  // 2. On success, exit immediately.
  // 3. On error, check if package already exists (cannot publish over) - if so, exit.
  // 4. On other errors, retry with exponential backoff: 1s, 2s, 4s delays.
  // 5. After maxRetries exhausted, add to fails list and log final error.
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      if (attempt > 0) {
        const delay = retryDelay * 2 ** (attempt - 1)
        logger.log(
          `${pkg.printName}: Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
        )
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Use pnpm with token-based authentication and provenance.
      // eslint-disable-next-line no-await-in-loop
      const result = await spawn(
        'pnpm',
        [
          'publish',
          '--provenance',
          '--access',
          'public',
          '--no-git-checks',
          '--tag',
          pkg.tag,
        ],
        {
          cwd: pkg.path,
          env: {
            ...process.env,
            NODE_AUTH_TOKEN: constants.ENV.NODE_AUTH_TOKEN,
          },
        },
      )
      if (result.stdout) {
        logger.log(result.stdout)
      }
      // Success - exit retry loop.
      return
    } catch (e) {
      lastError = e
      const stderr = e?.stderr ?? ''
      // Don't retry if package already exists.
      if (stderr.includes('cannot publish over')) {
        return
      }
      // Log the error but continue retrying.
      if (stderr && attempt < maxRetries - 1) {
        logger.warn(`${pkg.printName}: Publish attempt ${attempt + 1} failed`)
      }
    }
  }

  // All retries exhausted.
  state.fails.push(pkg.printName)
  const stderr = lastError?.stderr ?? ''
  if (stderr) {
    logger.log(stderr)
  }
}

async function publish(pkg, state, options) {
  if (pkg.isTrustedPublisher) {
    await publishTrusted(pkg, state, options)
  } else {
    await publishToken(pkg, state, options)
  }
}

async function publishPackages(packages, state, options) {
  const okayPackages = packages.filter(
    pkg => !state.fails.includes(pkg.printName),
  )
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(
    okayPackages,
    async pkg => {
      await publish(pkg, state, options)
    },
    { concurrency: 3 },
  )
}

async function publishAtCommit(sha) {
  logger.log(`\nChecking out commit ${sha}...`)
  await checkoutCommit(sha)

  // Rebuild at this commit to ensure we have the correct registry dist files.
  logger.log('Building registry...')
  await spawn('pnpm', ['run', 'build:registry'])

  const fails = []
  const skipped = []
  // Registry package comes last - publish after all other packages.
  const registryPackage = packageData({
    name: readPackageJsonSync(registryPkgPath).name,
    path: registryPkgPath,
    printName: '@socketsecurity/registry',
    isTrustedPublisher: true,
  })
  const allPackages = [
    ...constants.npmPackageNames.map(sockRegPkgName => {
      const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
      const pkgJson = readPackageJsonSync(pkgPath)
      return packageData({
        name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
        path: pkgPath,
        printName: sockRegPkgName,
        tag: getReleaseTag(pkgJson.version),
        isTrustedPublisher: true,
      })
    }),
    registryPackage,
  ]

  // Filter packages to only publish those with bumped versions.
  const packagesToPublish = []

  for (const pkg of allPackages) {
    const pkgJson = readPackageJsonSync(pkg.path)
    const localVersion = pkgJson.version

    // Fetch the latest version from npm registry.
    // eslint-disable-next-line no-await-in-loop
    const manifest = await fetchPackageManifest(`${pkgJson.name}@${pkg.tag}`)

    if (!manifest) {
      // Package doesn't exist on npm yet, publish it.
      packagesToPublish.push(pkg)
      logger.log(`${pkg.printName}: New package (${localVersion})`)
      continue
    }

    const remoteVersion = manifest.version

    // Compare versions - only publish if local is greater than remote.
    if (semver.gt(localVersion, remoteVersion)) {
      packagesToPublish.push(pkg)
      logger.log(`${pkg.printName}: ${remoteVersion} → ${localVersion}`)
    } else {
      skipped.push(pkg.printName)
    }
  }

  if (packagesToPublish.length === 0) {
    logger.log('No packages to publish at this commit')
    return { fails, skipped }
  }

  logger.log(
    `\nPublishing ${packagesToPublish.length} ${pluralize('package', packagesToPublish.length)}...\n`,
  )

  // Separate registry package from other packages.
  const registryPkgToPublish = packagesToPublish.find(
    pkg => pkg.printName === '@socketsecurity/registry',
  )
  const otherPackagesToPublish = packagesToPublish.filter(
    pkg => pkg.printName !== '@socketsecurity/registry',
  )

  // Publish non-registry packages first.
  if (otherPackagesToPublish.length > 0) {
    await publishPackages(otherPackagesToPublish, { fails, skipped })
  }

  // Update manifest.json with latest published versions before publishing registry.
  if (registryPkgToPublish && !fails.includes(registryPkgToPublish.printName)) {
    logger.log('\nUpdating manifest.json with latest npm versions...')
    await spawn('pnpm', ['run', 'update:manifest', '--force'])

    // Commit manifest changes if there are any.
    const changedFiles = await getChangedFiles()
    if (changedFiles.length > 0) {
      logger.log('Committing manifest.json updates...')
      await spawn('git', ['add', 'registry/manifest.json'])
      await spawn('git', [
        'commit',
        '-m',
        'Update manifest.json with latest npm versions',
      ])
    }

    // Publish registry package last.
    await publishPackages([registryPkgToPublish], { fails, skipped })
  }

  if (fails.length) {
    const msg = `Unable to publish ${fails.length} ${pluralize('package', fails.length)}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }

  if (skipped.length) {
    logger.log(
      `Skipped ${skipped.length} ${pluralize('package', skipped.length)}`,
    )
  }

  return { fails, skipped }
}

async function main() {
  // Ensure npm version is >= 11.5.1 for trusted publishing FIRST.
  // This must happen before any other operations.
  await ensureNpmVersion()

  // Exit early if not running in CI or with --force.
  if (!(cliArgs.force || constants.ENV.CI)) {
    return
  }

  const originalBranch = await getCurrentBranch()
  const originalSha = await getCommitSha('HEAD')

  try {
    // Find all version bump commits.
    const bumpCommits = await findVersionBumpCommits()

    if (bumpCommits.length === 0) {
      logger.log('No version bump commits found')
      return
    }

    // Sort by version descending (highest to lowest).
    bumpCommits.sort((a, b) => semver.compare(b.version, a.version))

    // Check the registry package for the latest published version.
    const registryPkgJson = readPackageJsonSync(registryPkgPath)
    const registryManifest = await fetchPackageManifest(
      `${registryPkgJson.name}@latest`,
    )

    if (registryManifest) {
      const publishedVersion = registryManifest.version
      logger.log(
        `Latest published: ${registryPkgJson.name}@${publishedVersion}`,
      )

      // Filter to only commits with versions newer than published version.
      const newerCommits = []
      for (const commit of bumpCommits) {
        if (semver.gt(commit.version, publishedVersion)) {
          newerCommits.push(commit)
        }
      }

      // Update bumpCommits to only include newer versions
      bumpCommits.length = 0
      bumpCommits.push(...newerCommits)
    } else {
      logger.log(
        `Latest published: ${registryPkgJson.name}@<not yet published>`,
      )
    }

    if (bumpCommits.length === 0) {
      logger.log('All versions already published')
      return
    }

    logger.log(
      `\nPublishing ${bumpCommits.length} unpublished version ${pluralize('bump', bumpCommits.length)}:`,
    )

    const displayCommits = cliArgs.debug
      ? bumpCommits
      : bumpCommits.slice(0, 10)

    for (const commit of displayCommits) {
      logger.log(`  ${commit.sha.slice(0, 7)} - v${commit.version}`)
    }
    logger.log('')

    for (const commit of bumpCommits) {
      // eslint-disable-next-line no-await-in-loop
      await publishAtCommit(commit.sha)
    }

    logger.log('\n✓ All versions published successfully')
  } finally {
    // Always return to the original branch/commit.
    logger.log(`\nReturning to ${originalBranch}...`)

    // Discard any uncommitted changes from the build process.
    await spawn('git', ['reset', '--hard'])

    if (originalBranch === 'HEAD') {
      await checkoutCommit(originalSha)
    } else {
      await spawn('git', ['checkout', originalBranch])
    }
  }
}

main().catch(console.error)
