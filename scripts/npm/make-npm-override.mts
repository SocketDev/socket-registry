/**
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

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { execScript } from '@socketsecurity/lib-stable/eco/npm/script'
import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { indentString } from '@socketsecurity/lib-stable/strings/format'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'
import { default as didYouMean, ReturnTypeEnums } from 'didyoumean2'
import fastGlob from 'fast-glob'
import { open } from 'out-url'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'
import { UTF8 } from '@socketsecurity/lib-stable/constants/encoding'
import { ESNEXT } from '../constants/core.mts'
import { LOG_SYMBOLS } from '@socketsecurity/lib-stable/logger/symbols'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { isDirEmptySync } from '@socketsecurity/lib-stable/fs/inspect'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { isValidPackageName } from '@socketsecurity/lib-stable/packages/validation'
import { resolveGitHubTgzUrl } from '@socketsecurity/lib-stable/packages/fetch'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'
import { resolveRegistryPackageName } from '@socketsecurity/lib-stable/packages/specs'
import { extractPackage } from '@socketsecurity/lib-stable/packages/tarball'
import {
  confirm,
  input,
  search,
  select,
} from '@socketsecurity/lib-stable/stdio/prompts'
import {
  naturalCompare,
  naturalSorter,
} from '@socketsecurity/lib-stable/sorts/natural'
import {
  LICENSE,
  LICENSE_ORIGINAL,
  NPM_PACKAGES_PATH,
  ROOT_PATH,
} from '../constants/paths.mts'
import {
  TEMPLATE_CJS,
  TEMPLATE_CJS_BROWSER,
  TEMPLATE_CJS_ESM,
  TEMPLATE_ES_SHIM_CONSTRUCTOR,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  TEMPLATE_ES_SHIM_STATIC_METHOD,
  TS_LIBS_AVAILABLE,
  TS_TYPES_AVAILABLE,
} from '../constants/templates.mts'
import {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTemplate,
  getTypeScriptActions,
  writeAction,
} from '../repo/util/templates.mts'
import {
  esShimChoices,
  getCompatData,
  readLicenses,
  toChoice,
} from './make-npm-override-helpers.mts'
import {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  resolvePackageLicenses,
} from '@socketsecurity/lib-stable/packages/licenses'
import {
  isSubpathExports,
  resolvePackageJsonEntryExports,
} from '@socketsecurity/lib-stable/packages/exports'
import type { EditablePackageJsonInstance } from '@socketsecurity/lib-stable/packages/edit'
import type { LicenseNode } from '@socketsecurity/lib-stable/packages/types'

interface CompatData {
  spec_url?: string | undefined
  support?:
    | { nodejs?: { version_added?: string | boolean | undefined } | undefined }
    | undefined
}

interface TsRef {
  name: string
  value: string
}

const logger = getDefaultLogger()

const npmPackagesPath = NPM_PACKAGES_PATH
const tsLibsAvailable = TS_LIBS_AVAILABLE
const tsTypesAvailable = TS_TYPES_AVAILABLE

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

const possibleTsRefs = [...tsLibsAvailable, ...tsTypesAvailable]
const maxTsRefLength = possibleTsRefs.reduce((n, v) => Math.max(n, v.length), 0)

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
  if (existsSync(pkgPath) && !isDirEmptySync(pkgPath)) {
    const relPkgPath = path.relative(ROOT_PATH, pkgPath)
    logger.warn(`${origPkgName} already exists at ${relPkgPath}`)
    if (
      !(await confirm({
        message: 'Do you want to overwrite it?',
        default: false,
      }))
    ) {
      return
    }
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
  const isEsm = nmPkgJson.type === 'module'
  const isEsShim =
    relJsFilepaths.includes('auto.js') &&
    relJsFilepaths.includes('implementation.js') &&
    relJsFilepaths.includes('index.js') &&
    relJsFilepaths.includes('polyfill.js') &&
    relJsFilepaths.includes('shim.js')

  let nodeRange: string | undefined
  let templateChoice: string | undefined
  const tsRefs: TsRef[] = []
  if (isEsShim) {
    const { maintainedNodeVersions } = await import('../constants/node.mts')
    const { PACKAGE_DEFAULT_NODE_RANGE } = await import('../constants/node.mts')
    const parts = origPkgName
      .split(/[-.]/)
      .filter((p: string) => p !== 'es' && p !== 'helpers')
    const compatData = getCompatData(['javascript', 'builtins', ...parts]) as
      | CompatData
      | undefined
    const rawVersionAdded = compatData?.support?.nodejs?.version_added
    const versionAdded =
      typeof rawVersionAdded === 'string'
        ? rawVersionAdded
        : maintainedNodeVersions.last

    nodeRange = `>=${maintainedNodeVersions.next}`
    if (!semver.satisfies(versionAdded, nodeRange)) {
      nodeRange = `>=${maintainedNodeVersions.current}`
      if (!semver.satisfies(versionAdded, nodeRange)) {
        nodeRange = PACKAGE_DEFAULT_NODE_RANGE
      }
    }
    if (nodeRange !== PACKAGE_DEFAULT_NODE_RANGE) {
      tsRefs.push({ name: 'lib', value: ESNEXT })
    }
    const loweredSpecUrl = compatData?.spec_url?.toLowerCase() ?? ''
    if (
      (parts.length === 3 &&
        (parts[1] === 'proto' || parts[1] === 'prototype')) ||
      loweredSpecUrl.includes(`${parts[0]}.prototype`)
    ) {
      templateChoice = TEMPLATE_ES_SHIM_PROTOTYPE_METHOD
    } else if (
      parts.length === 2 ||
      loweredSpecUrl.includes(`${parts[0]}.${parts.at(-1)}`)
    ) {
      templateChoice = TEMPLATE_ES_SHIM_STATIC_METHOD
    } else if (
      parts.length === 1 ||
      loweredSpecUrl.includes(`${parts[0]}-constructor`)
    ) {
      templateChoice = TEMPLATE_ES_SHIM_CONSTRUCTOR
    } else {
      templateChoice = (await select({
        message: 'Pick the es-shim template to use',
        choices: esShimChoices,
      })) as string | undefined
    }
  } else if (isEsm) {
    templateChoice = TEMPLATE_CJS_ESM
  } else {
    templateChoice = (await select({
      message: 'Pick the package template to use',
      choices: [
        { name: 'cjs', value: TEMPLATE_CJS },
        { name: 'cjs and browser', value: TEMPLATE_CJS_BROWSER },
      ],
    })) as string | undefined
  }
  if (templateChoice === undefined) {
    // Exit if user force closed the prompt.
    return
  }
  if (!tsRefs.length) {
    const answer = await confirm({
      message: 'Need a TypeScript lib/types reference?',
      default: false,
    })
    if (answer === undefined) {
      // Exit if user force closed the prompt.
      return
    }
    if (answer) {
      const searchResult = await search({
        message: 'Which one?',
        source: async (term: string | undefined) => {
          if (!term) {
            return []
          }
          // Trim, truncate, and lower input.
          const formatted = term.trim().slice(0, maxTsRefLength).toLowerCase()
          if (!formatted) {
            return [term]
          }
          let matches: string[] | undefined
          // Simple search.
          for (const p of ['es2', 'es', 'e', 'de', 'd', 'n', 'w']) {
            if (term.startsWith(p) && term.length <= 3) {
              matches = possibleTsRefs.filter(l => l.startsWith(p))
              break
            }
          }
          if (matches === undefined) {
            // Advanced closest match search.
            matches = didYouMean(formatted, possibleTsRefs, {
              caseSensitive: true,
              deburr: false,
              returnType: ReturnTypeEnums.ALL_CLOSEST_MATCHES,
              threshold: 0.2,
            })
          }
          if (!matches.length) {
            return [toChoice(term)]
          }
          const firstMatch = matches[0]!
          const sortedTail =
            matches.length > 1 ? naturalSorter(matches.slice(1)).desc() : []
          // If a match starts with input then don't include input in the results.
          if (matches.some(m => m.startsWith(term))) {
            return [firstMatch, ...sortedTail].map(toChoice)
          }
          let first = firstMatch
          let second = term
          if (term.length > firstMatch.length) {
            first = term
            second = firstMatch
          }
          return [first, second, ...sortedTail].map(toChoice)
        },
      })
      if (typeof searchResult !== 'string') {
        // Exit if user force closed the prompt.
        return
      }
      const name = tsLibsAvailable.has(searchResult) ? 'lib' : 'types'
      tsRefs.push({ name, value: searchResult })
    }
  }

  const templatePkgPath = getTemplate(templateChoice)
  if (!templatePkgPath) {
    logger.fail(`No template found for ${templateChoice}`)
    return
  }

  const interop = [
    'cjs',
    ...(templateChoice === TEMPLATE_CJS_ESM ? ['esm'] : []),
    ...(templateChoice === TEMPLATE_CJS_BROWSER ? ['browserify'] : []),
  ]

  // First copy the template directory contents to the package path.
  await fs.cp(templatePkgPath, pkgPath, { recursive: true })
  // Then modify the new package's package.json source and write to disk.
  const { PACKAGE_DEFAULT_NODE_RANGE } = await import('../constants/node.mts')
  await writeAction(
    await getPackageJsonAction(pkgPath, {
      engines: {
        node: nodeRange ?? PACKAGE_DEFAULT_NODE_RANGE,
      },
    }),
  )
  // Finally, modify other package file sources and write to disk.
  await Promise.allSettled(
    [
      await getNpmReadmeAction(pkgPath, { interop }),
      ...(await getLicenseActions(pkgPath)),
      ...(await getTypeScriptActions(pkgPath, {
        transform(filepath, data) {
          // Exclude /// <reference types="node" /> from .d.ts files, allowing
          // them in .d.cts files.
          const isCts = filepath.endsWith('.d.cts')
          data['references'] = tsRefs.filter(
            r => isCts || !(r.name === 'types' && r.value === 'node'),
          )
          return data
        },
      })),
    ].map(writeAction),
  )
  // Create LICENSE.original files.
  const { length: licenseCount } = licenseContents
  const filesFieldAdditions: string[] = []
  for (let i = 0; i < licenseCount; i += 1) {
    const licenseContent = licenseContents[i]
    if (!licenseContent) {
      continue
    }
    const { content, name } = licenseContent
    const extRaw = path.extname(name)
    // Omit the .txt extension since licenses are assumed plain text by default.
    const ext = extRaw === '.txt' ? '' : extRaw
    const basename = licenseCount === 1 ? LICENSE : path.basename(name, ext)
    const originalLicenseName = `${basename}.original${ext}`
    if (
      // `npm pack` will automatically include LICENSE{.*,} files so we can
      // exclude them from the package.json "files" field.
      originalLicenseName !== LICENSE_ORIGINAL &&
      originalLicenseName !== `${LICENSE_ORIGINAL}.md`
    ) {
      filesFieldAdditions.push(originalLicenseName)
    }

    await fs.writeFile(path.join(pkgPath, originalLicenseName), content, UTF8)
  }
  if (filesFieldAdditions.length) {
    // Load the freshly written package.json and edit its "exports" and "files" fields.
    const editablePkgJsonResult = await readPackageJson(pkgPath, {
      editable: true,
      normalize: true,
    })
    if (!editablePkgJsonResult) {
      logger.fail(`Failed to load package.json at ${pkgPath}`)
      return
    }
    const editablePkgJson =
      editablePkgJsonResult as unknown as EditablePackageJsonInstance
    const entryExports = resolvePackageJsonEntryExports(
      editablePkgJson.content.exports,
    )
    const nmEntryExports = resolvePackageJsonEntryExports(nmPkgJson.exports)
    const useNmEntryExports =
      entryExports === undefined && isSubpathExports(nmEntryExports)
    editablePkgJson.update({
      main: useNmEntryExports ? undefined : editablePkgJson.content.main,
      exports: (useNmEntryExports ? nmEntryExports : entryExports) as
        | string
        | string[]
        | Record<string, unknown>
        | undefined,
      files: [
        ...(editablePkgJson.content.files ?? []),
        ...filesFieldAdditions,
      ].toSorted(naturalCompare),
    })
    await editablePkgJson.save()
  }

  // Update monorepo package.json workspaces definition and test/npm files.
  try {
    const spawnOptions = {
      cwd: ROOT_PATH,
      stdio: 'inherit',
    } as const
    await execScript('update:manifest', [], spawnOptions)
    await execScript('update:package-json', [], spawnOptions)
    if (!cliArgs['quiet']) {
      logger.log('Finished 🎉')
    }
  } catch (e) {
    logger.fail('Package override finalization encountered an error:')
    logger.error(e)
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
