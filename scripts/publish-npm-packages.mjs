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
    if (
      !message.includes('registry package') &&
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
  const result = await spawn('npm', ['--version'])
  const npmVersion = result.stdout.trim()
  logger.log(`Current npm version: ${npmVersion}`)

  // Check if npm version is >= 11.5.1 (required for trusted publishing).
  try {
    const semverResult = await spawn('npx', [
      '--yes',
      'semver',
      npmVersion,
      '-r',
      '>=11.5.1',
    ])
    if (semverResult.stdout.trim() === '') {
      throw new Error('npm version too old')
    }
    logger.log(
      `npm version ${npmVersion} meets the 11.5.1+ requirement for trusted publishing`,
    )
  } catch {
    logger.log('Installing npm 11.5.1+ for trusted publishing...')
    await spawn('npm', ['install', '-g', 'npm@latest'])
    const newResult = await spawn('npm', ['--version'])
    logger.log(`Updated npm version: ${newResult.stdout.trim()}`)
  }
}

async function publishTrusted(pkg, state) {
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required.')
  }

  try {
    // Use npm for trusted publishing with OIDC tokens.
    const result = await spawn('npm', ['publish', '--access', 'public'], {
      cwd: pkg.path,
      env: process.env,
      // Don't set NODE_AUTH_TOKEN for trusted publishing - uses OIDC.
    })
    if (result.stdout) {
      logger.log(result.stdout)
    }
  } catch (e) {
    const stderr = e?.stderr ?? ''
    if (!stderr.includes('cannot publish over')) {
      state.fails.push(pkg.printName)
      if (stderr) {
        logger.log(stderr)
      }
    }
  }
}

async function publishToken(pkg, state) {
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required.')
  }
  try {
    // Use pnpm with token-based authentication and provenance.
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
  } catch (e) {
    const stderr = e?.stderr ?? ''
    if (!stderr.includes('cannot publish over')) {
      state.fails.push(pkg.printName)
      if (stderr) {
        logger.log(stderr)
      }
    }
  }
}

async function publish(pkg, state) {
  if (pkg.isTrustedPublisher) {
    await publishTrusted(pkg, state)
  } else {
    await publishToken(pkg, state)
  }
}

async function publishPackages(packages, state) {
  const okayPackages = packages.filter(
    pkg => !state.fails.includes(pkg.printName),
  )
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(
    okayPackages,
    async pkg => {
      await publish(pkg, state)
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
  const allPackages = [
    packageData({
      name: '../registry/dist/index.js',
      path: registryPkgPath,
      isTrustedPublisher: true,
    }),
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

  await publishPackages(packagesToPublish, { fails, skipped })

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
  // Exit early if not running in CI or with --force.
  if (!(cliArgs.force || constants.ENV.CI)) {
    return
  }

  // Ensure npm version is >= 11.5.1 for trusted publishing.
  await ensureNpmVersion()

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
      logger.log(`Latest published version: v${publishedVersion}`)

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
    logger.log()

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
