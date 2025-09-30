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

const {
  COLUMN_LIMIT,
  LATEST,
  SOCKET_REGISTRY_SCOPE,
  npmPackagesPath,
  registryPkgPath,
} = constants

const { values: cliArgs } = parseArgs({
  options: {
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

async function publishTrusted(pkg, state) {
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required.')
  }
  try {
    // Use npm for trusted publishing with OIDC tokens.
    const result = await spawn('npm', ['publish', '--access', 'public'], {
      cwd: pkg.path,
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

async function main() {
  // Exit early if not running in CI or with --force.
  if (!(cliArgs.force || constants.ENV.CI)) {
    return
  }

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
      if (!cliArgs.quiet) {
        logger.log(
          `${pkg.printName}: Skipped (${localVersion} ≤ ${remoteVersion})`,
        )
      }
    }
  }

  if (packagesToPublish.length === 0) {
    logger.log('No packages to publish')
    return
  }

  logger.log(
    `\nPublishing ${packagesToPublish.length} ${pluralize('package', packagesToPublish.length)}...\n`,
  )

  await publishPackages(packagesToPublish, { fails })

  if (fails.length) {
    const msg = `Unable to publish ${fails.length} ${pluralize('package', fails.length)}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }

  if (skipped.length && !cliArgs.quiet) {
    logger.log(
      `\nSkipped ${skipped.length} ${pluralize('package', skipped.length)} (no version bump)`,
    )
  }
}

main().catch(console.error)
