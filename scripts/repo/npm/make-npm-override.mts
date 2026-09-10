/*
 * @file Creates Socket registry package overrides for npm packages. Interactive
 *   CLI tool that guides users through creating secure package overrides:
 *
 *   - Fetches and extracts the original npm package
 *   - Analyzes package structure and licenses
 *   - Generates appropriate override templates (CJS, ESM, ES-shim, etc.)
 *   - Sets up TypeScript support if needed
 *   - Creates README and LICENSE files
 *   - Handles browser compatibility and shim requirements
 */

import { selectOverrideTemplate } from './override/template.mts'
import { writeOverrideFiles } from './override/files.mts'

import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { parseArgs } from '../util/parse-args.mts'
import { indentString } from '@socketsecurity/lib-stable/strings/format'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'
import fastGlob from 'fast-glob'
import { open } from 'out-url'
import { isMainModule } from '../../fleet/process/is-main-module.mts'
import { runMain } from '../../fleet/process/run-main.mts'
import { LOG_SYMBOLS } from '@socketsecurity/lib-stable/logger/symbols'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { isDirEmptySync } from '@socketsecurity/lib-stable/fs/inspect'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { isValidPackageName } from '@socketsecurity/lib-stable/packages/validation'
import { resolveGitHubTgzUrl } from '@socketsecurity/lib-stable/packages/fetch'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'
import { resolveRegistryPackageName } from '@socketsecurity/lib-stable/packages/specs'
import { extractPackage } from '@socketsecurity/lib-stable/packages/tarball'
import { confirm, input } from '@socketsecurity/lib-stable/stdio/prompts'
import { NPM_PACKAGES_PATH, ROOT_PATH } from '../constants/paths.mts'
import { getTemplate } from '../util/templates.mts'
import { readLicenses } from './override-manifest.mts'
import {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  resolvePackageLicenses,
} from '@socketsecurity/lib-stable/packages/licenses'
import type { LicenseNode } from '@socketsecurity/lib-stable/packages/types'

const logger = getDefaultLogger()

const npmPackagesPath = NPM_PACKAGES_PATH

const { positionals: cliPositionals, values: cliArgs } = parseArgs({
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

async function confirmOverrideReplacement(
  pkgPath: string,
  origPkgName: string,
): Promise<boolean> {
  if (existsSync(pkgPath) && !isDirEmptySync(pkgPath)) {
    const relPkgPath = path.relative(ROOT_PATH, pkgPath)
    logger.warn(`${origPkgName} already exists at ${relPkgPath}`)
    if (
      !(await confirm({
        message: 'Do you want to overwrite it?',
        default: false,
      }))
    ) {
      return false
    }
  }
  return true
}

async function main(): Promise<void> {
  const origPkgNameAnswer = await input({
    message: 'What is the name of the package to override?',
    default: cliPositionals.at(0),
    required: true,
    validate: async (pkgName: string) =>
      isValidPackageName(pkgName) && !!(await fetchPackageManifest(pkgName)),
  })
  if (typeof origPkgNameAnswer !== 'string') {
    // Exit if user force closed the prompt.
    return
  }
  const origPkgName = origPkgNameAnswer
  const sockRegPkgName = resolveRegistryPackageName(origPkgName)
  const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
  if (!(await confirmOverrideReplacement(pkgPath, origPkgName))) {
    return
  }
  let badLicenses: LicenseNode[] = []
  let licenses: LicenseNode[] = []
  let licenseContents: Array<{ name: string; content: string }> = []
  let licenseWarnings: string[] = []
  let nmPkgJson: Awaited<ReturnType<typeof readPackageJson>>
  let relJsFilepaths: string[] = []
  await extractPackage(origPkgName, undefined, async (nmPkgPath: string) => {
    nmPkgJson = await readPackageJson(nmPkgPath, { normalize: true })
    if (!nmPkgJson) {
      return
    }
    relJsFilepaths = await fastGlob.glob(['*.js'], {
      ignore: ['**/package.json'],
      cwd: nmPkgPath,
    })
    licenses = resolvePackageLicenses(nmPkgJson.license ?? '', nmPkgPath)
    licenseWarnings = collectLicenseWarnings(licenses)
    badLicenses = collectIncompatibleLicenses(licenses)
    if (!badLicenses.length) {
      licenseContents = await readLicenses(nmPkgPath)
      if (!licenseContents.length) {
        const tgzUrl = await resolveGitHubTgzUrl(origPkgName, nmPkgJson)
        if (tgzUrl) {
          await extractPackage(
            tgzUrl,
            undefined,
            async (tarDirPath: string) => {
              licenseContents = await readLicenses(tarDirPath)
            },
          )
        }
      }
    }
  })
  if (!nmPkgJson) {
    logger.fail(`Failed to extract ${origPkgName}`)
    return
  }
  if (licenseWarnings.length) {
    const formattedWarnings = licenseWarnings.map(w =>
      indentString(`· ${w}`, { count: 2 }),
    )
    logger.warn(`${origPkgName} has license warnings:`)
    for (let i = 0, { length } = formattedWarnings; i < length; i += 1) {
      logger.warn(formattedWarnings[i]!)
    }
  }
  if (badLicenses.length) {
    const singularOrPlural = pluralize('license', {
      count: badLicenses.length,
    })
    const badLicenseNames = badLicenses.map(n => n.license)
    const warning = `${LOG_SYMBOLS['warn']} ${origPkgName} has incompatible ${singularOrPlural} ${badLicenseNames.join(', ')}.`
    const answer = await confirm({
      message: `${warning}.\nDo you want to continue?`,
      default: false,
    })
    if (!answer) {
      if (answer === false) {
        await open(`https://socket.dev/npm/package/${origPkgName}`)
      }
      return
    }
  }
  const selected = await selectOverrideTemplate(
    origPkgName,
    nmPkgJson.type,
    relJsFilepaths,
  )
  if (!selected) {
    return
  }
  const { nodeRange, templateChoice, tsRefs } = selected

  const templatePkgPath = getTemplate(templateChoice)
  if (!templatePkgPath) {
    logger.fail(`No template found for ${templateChoice}`)
    return
  }

  if (
    !(await writeOverrideFiles({
      templatePkgPath,
      pkgPath,
      templateChoice,
      nodeRange,
      tsRefs,
      licenseContents,
      nmPkgJson,
    }))
  ) {
    return
  }

  // Update monorepo package.json workspaces definition and test/npm files.
  try {
    // Invoke the updater scripts directly — the `update:manifest` /
    // `update:package-json` root script aliases these once ran through were
    // dropped from package.json, which left this call site dead.
    const spawnOptions = {
      cwd: ROOT_PATH,
      stdio: 'inherit',
    } as const
    await spawn(
      process.execPath,
      ['scripts/repo/npm/update-manifest.mts'],
      spawnOptions,
    )
    await spawn(
      process.execPath,
      ['scripts/repo/npm/update-npm-package-json.mts'],
      spawnOptions,
    )
    if (!cliArgs['quiet']) {
      logger.log('Finished 🎉')
      logger.log(
        `Next: \`pnpm run npm:wire-port -- ${origPkgName}\` pins the upstream, adds the lockstep row, and prints the suite header to port against.`,
      )
    }
  } catch (e) {
    logger.fail('Package override finalization encountered an error:')
    logger.error(e)
  }
}

if (isMainModule(import.meta.url)) {
  runMain(
    async () => {
      await main().catch((e: unknown) => {
        logger.error(e)
        process.exitCode = 1
      })
    },
    {
      describe: 'creates a registry npm override',
      help: 'Usage: pnpm make-npm-override [package] [options]\n--force, -f  Replace existing output\n--quiet  Suppress progress',
    },
  )
}
