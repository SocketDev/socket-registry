import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { parseArgs } from './util/parse-args.mts'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { isMainModule, runMain } from './lib/cli.mts'
import { describeAnchor } from './release/anchor.mts'
import { REPO_ROOT } from './lib/paths.mts'
import {
  deriveSubjectRelease,
  preparedVersionFrom,
  readManifest,
  SUBJECT_CHANGELOG_PATH,
  SUBJECT_MANIFEST_PATH,
  SUBJECT_NAME,
  subjectWiringError,
} from './util/bump-subject.mts'

import {
  composeBumpSection,
  reconcileAppliedBump,
  resolveBumpVersion,
  writeBumpChanges,
} from './bump-release.mts'

export {
  deriveSubjectRelease,
  preparedVersionFrom,
  SUBJECT_CHANGELOG_PATH,
  SUBJECT_MANIFEST_PATH,
  SUBJECT_NAME,
  subjectWiringError,
}

const logger = getDefaultLogger()
const rootPath = REPO_ROOT

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { default: false, type: 'boolean' },
      'empty-changelog-entry': { type: 'string' },
      'release-as': { type: 'string' },
      'write-only': { default: false, type: 'boolean' },
    },
    strict: false,
  })
  const dryRun = !!values['dry-run']
  const releaseAs = values['release-as']
  const writeOnly = !!values['write-only']
  const emptyChangelogEntry = values['empty-changelog-entry']

  const { parsed: rootPkg, raw: rootRaw } = readManifest('package.json')
  const wiringError = subjectWiringError(rootPkg)
  if (wiringError) {
    logger.fail(wiringError)
    process.exitCode = 1
    return
  }

  const { parsed: pkg, raw: pkgRaw } = readManifest(SUBJECT_MANIFEST_PATH)
  if (!pkg.version) {
    logger.fail(`${SUBJECT_MANIFEST_PATH} has no version field.`)
    process.exitCode = 1
    return
  }
  if (pkg.name !== SUBJECT_NAME) {
    logger.fail(
      `${SUBJECT_MANIFEST_PATH} names ${pkg.name ?? '(missing)'}, ` +
        `wanted ${SUBJECT_NAME} — refusing to bump an unexpected subject.`,
    )
    process.exitCode = 1
    return
  }

  const derivation = await deriveSubjectRelease({
    manifestVersion: pkg.version,
    warn: msg => logger.warn(msg),
  })
  if (!derivation) {
    logger.fail(
      `Cannot anchor the changelog range for ${SUBJECT_NAME}: either the ` +
        `registry is unreachable — offline, the released base cannot be ` +
        `confirmed — or a previous release exists but its v-tag is missing ` +
        `or off-lineage, no bump commit for it is reachable, and the ` +
        `registry publish time is unavailable. Re-run online, or restore ` +
        `the previous release's tag; deriving from an OLDER tag would ` +
        `re-list already-shipped commits.`,
    )
    process.exitCode = 1
    return
  }
  const { anchor, commits } = derivation

  const changelogPath = path.join(rootPath, SUBJECT_CHANGELOG_PATH)
  const existingChangelog = readFileSync(changelogPath, 'utf8')

  const resolved = resolveBumpVersion(
    releaseAs,
    pkg.version,
    existingChangelog,
    derivation,
  )
  if (!resolved) {
    return
  }
  const { level, nextVersion } = resolved
  const repositoryUrl =
    typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  const date = new Date().toISOString().slice(0, 10)

  if (
    await reconcileAppliedBump({
      existingChangelog,
      nextVersion,
      pkg,
      rootPkg,
      rootRaw,
      dryRun,
      writeOnly,
    })
  ) {
    return
  }

  const composed = composeBumpSection({
    nextVersion,
    date,
    repositoryUrl,
    existingChangelog,
    commits,
    emptyChangelogEntry,
  })
  if (!composed) {
    return
  }
  const { section, baseChangelog, promoted } = composed

  logger.log(
    `${SUBJECT_NAME}: ${pkg.version} → ${nextVersion} ` +
      `(${level}${releaseAs ? ' — forced via --release-as' : ''}; ` +
      `${promoted ? 'from [Unreleased]' : `${commits.length} commit(s) since ${describeAnchor(anchor)}`})`,
  )
  logger.log('')
  logger.log(section)
  logger.log('')

  if (dryRun) {
    logger.success(
      'Dry-run: no files written. Re-run without --dry-run to bump.',
    )
    return
  }

  await writeBumpChanges({
    nextVersion,
    pkgRaw,
    rootRaw,
    changelogPath,
    baseChangelog,
    section,
    writeOnly,
  })
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
      json: 'result',
      describe: 'prepares a registry release version',
      help: 'Usage: pnpm bump [--dry-run] [--release-as <level>] [--write-only] [--empty-changelog-entry <text>]',
    },
  )
}
