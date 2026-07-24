/**
 * @file Repo bump overlay for the fleet npm-publish path. socket-registry is a
 *   MONOREPO whose release subject is NOT the root manifest: the published
 *   package is `@socketsecurity/registry`, whose manifest lives at
 *   `registry/package.json` and whose changelog lives at
 *   `registry/CHANGELOG.md`. The private root — `@socketregistry/monorepo` —
 *   is never published. `publish-infra/npm/bump.mts` resolves this overlay
 *   ahead of the canonical `scripts/fleet/bump.mts` and invokes it with the
 *   same contract: `--write-only` writes the bumped files without committing —
 *   the CI leg then commits whatever `git diff` reports via the GitHub API —
 *   `--dry-run` previews and writes nothing, `--release-as` forces the level,
 *   `--empty-changelog-entry` names the one line an entry-less release records.
 *   Three deliberate deviations from the canonical bump, all subject-shaped
 *   and implemented in util/bump-subject.mts:
 *
 *   1. SUBJECT BINDING — the release lane anchors on `registry/package.json` and
 *      the npm ledger for `@socketsecurity/registry`; the changelog range
 *      derivation is the SHARED anchor chain from lib/release-anchor.mts, so
 *      the semantics cannot fork.
 *   2. ROOT VERSION MIRROR — the root manifest's `version` is written to the
 *      subject's version on every bump. The cascade-owned publish-infra reads
 *      the ROOT manifest to name the `npm-publish-v<version>` release branch
 *      and the `chore: bump version to <version>` commit, and the release
 *      pipeline verifies the bump landed by reading the root version; the root
 *      is private, so its version is free to mirror the subject.
 *   3. WIRING GUARD — the run refuses outright unless the root manifest is
 *      `private: true` AND carries `publishConfig.directory: "registry"`. The
 *      cascade-owned `npm-publish.mts --staged` runs `pnpm stage publish` from
 *      the REPO ROOT; pnpm 11 does not refuse a private manifest on the
 *      single-package publish path — verified empirically — so without the
 *      directory redirect the staged leg would upload the private root. The
 *      guard makes that misconfiguration a loud stop instead of a bad upload.
 *      Usage: node scripts/repo/bump.mts [--dry-run] [--release-as <level>]
 *      [--write-only] [--empty-changelog-entry "<line>"]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { gt } from '@socketsecurity/lib-stable/versions/compare'

import { isMainModule } from '../fleet/_shared/is-main-module.mts'
import {
  changelogHasVersionSection,
  insertChangelogSection,
  replaceVersion,
} from '../fleet/bump.mts'
import {
  bumpLevelFor,
  changelogHeading,
  computeNextVersion,
  generateChangelogSection,
  promoteUnreleased,
  repoBaseUrl,
  sectionHasEntries,
  UNRELEASED_HEADING,
  versionHintFrom,
  withChangelogEntry,
} from '../fleet/lib/changelog.mts'
import { describeAnchor } from '../fleet/lib/release-anchor.mts'
import { REPO_ROOT } from '../fleet/paths.mts'
import { runCapture } from '../fleet/publish-infra/shared.mts'
import {
  deriveSubjectRelease,
  preparedVersionFrom,
  readManifest,
  SUBJECT_CHANGELOG_PATH,
  SUBJECT_MANIFEST_PATH,
  SUBJECT_NAME,
  subjectWiringError,
} from './util/bump-subject.mts'

import type { BumpLevel } from '../fleet/lib/changelog.mts'

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
  const { anchor, base, commits } = derivation

  const changelogPath = path.join(rootPath, SUBJECT_CHANGELOG_PATH)
  const existingChangelog = readFileSync(changelogPath, 'utf8')

  // Version resolution, most-explicit first: --release-as, then a committed
  // `X.Y.Z-prerelease` hint, then a PREPARED RELEASE — manifest ahead of base
  // with its changelog section already committed — then the commit-type
  // heuristic. MAJOR is never derived.
  const hinted = versionHintFrom(pkg.version)
  const prepared = preparedVersionFrom({
    base,
    changelog: existingChangelog,
    manifestVersion: pkg.version,
  })
  let level: BumpLevel | undefined
  let namedVersion: string | undefined
  if (typeof releaseAs === 'string') {
    if (
      releaseAs !== 'major' &&
      releaseAs !== 'minor' &&
      releaseAs !== 'patch'
    ) {
      logger.fail(
        `--release-as must be one of major | minor | patch (got "${releaseAs}").`,
      )
      process.exitCode = 1
      return
    }
    level = releaseAs
  } else if (hinted) {
    if (hinted.split('.')[0] !== base.split('.')[0]) {
      logger.fail(
        `Version hint ${pkg.version} names ${hinted}, a MAJOR jump past the ` +
          `last released version ${base} — a major requires the explicit ` +
          `--release-as major signal, not a hint.`,
      )
      process.exitCode = 1
      return
    }
    if (!gt(hinted, base)) {
      logger.fail(
        `Version hint ${pkg.version} names ${hinted}, which is not ahead of ` +
          `the last released version ${base} — it would re-publish or move ` +
          `backward. Name a version greater than ${base}.`,
      )
      process.exitCode = 1
      return
    }
    namedVersion = hinted
    level = 'patch'
    logger.log(
      `Version hint found: ${pkg.version} → releasing as ${hinted} ` +
        `(hint overrides the commit-type heuristic).`,
    )
  } else if (prepared) {
    namedVersion = prepared
    level = 'patch'
    logger.log(
      `Prepared release found: ${SUBJECT_MANIFEST_PATH} reads ${prepared} ` +
        `ahead of registry latest ${base} and ${SUBJECT_CHANGELOG_PATH} ` +
        `already carries its section — releasing as ${prepared}.`,
    )
  } else {
    level = bumpLevelFor(commits)
    if (level === 'major') {
      logger.fail(
        `Breaking commit(s) found since ${describeAnchor(anchor)} — a MAJOR ` +
          `bump requires an explicit human decision. Re-run with ` +
          `--release-as major, or --release-as minor|patch if the breaking ` +
          `marker is wrong.`,
      )
      process.exitCode = 1
      return
    }
  }
  if (!level) {
    logger.fail(
      `No user-visible commits since ${describeAnchor(anchor)} — nothing to ` +
        `release. Land a user-visible change, or pass --release-as ` +
        `<major|minor|patch> to force.`,
    )
    process.exitCode = 1
    return
  }

  const nextVersion = namedVersion ?? computeNextVersion(base, level)
  const repositoryUrl =
    typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  const date = new Date().toISOString().slice(0, 10)

  // Bump-exactly-once re-entry: the subject already carries the section and
  // the version. The only thing possibly left is the root version mirror —
  // complete it instead of failing, so a half-synced tree self-heals.
  if (changelogHasVersionSection(existingChangelog, nextVersion)) {
    if (pkg.version === nextVersion) {
      if (rootPkg.version === nextVersion) {
        logger.success(
          `Bump already applied: ${SUBJECT_MANIFEST_PATH} reads ` +
            `${nextVersion}, ${SUBJECT_CHANGELOG_PATH} has its section, and ` +
            `the root version mirror matches — nothing to write.`,
        )
        return
      }
      if (dryRun) {
        logger.success(
          `Dry-run: bump already applied for ${nextVersion}; would sync the ` +
            `root version mirror (${rootPkg.version} → ${nextVersion}).`,
        )
        return
      }
      writeFileSync(
        path.join(rootPath, 'package.json'),
        replaceVersion(rootRaw, nextVersion),
      )
      if (writeOnly) {
        logger.success(
          `Bump already applied for ${nextVersion}; synced the root version ` +
            `mirror (${rootPkg.version} → ${nextVersion}) — --write-only, ` +
            `no commit.`,
        )
        return
      }
      const syncCommit = await runCapture(
        'git',
        [
          'commit',
          '-o',
          'package.json',
          '-m',
          `chore: bump version to ${nextVersion}`,
        ],
        rootPath,
      )
      if (syncCommit.code !== 0) {
        logger.fail('git commit failed:')
        logger.fail(syncCommit.stdout)
        process.exitCode = 1
        return
      }
      logger.success(
        `Bump already applied for ${nextVersion}; committed the root ` +
          `version mirror sync.`,
      )
      return
    }
    logger.fail(
      `${SUBJECT_CHANGELOG_PATH} already has a ${nextVersion} section but ` +
        `${SUBJECT_MANIFEST_PATH} reads ${pkg.version} — a half-applied ` +
        `bump.\n  Fix: reconcile the manifest with the changelog — or ` +
        `remove the stale section — then re-run.`,
    )
    process.exitCode = 1
    return
  }

  const versionHeading = changelogHeading(
    nextVersion,
    date,
    repoBaseUrl(repositoryUrl),
  )
  const promoted = promoteUnreleased(existingChangelog, versionHeading)
  let section = promoted
    ? promoted.section
    : generateChangelogSection({
        commits,
        date,
        repoUrl: repoBaseUrl(repositoryUrl),
        version: nextVersion,
      })
  const baseChangelog = promoted ? promoted.changelog : existingChangelog

  if (!sectionHasEntries(section)) {
    if (typeof emptyChangelogEntry === 'string' && emptyChangelogEntry.trim()) {
      section = withChangelogEntry(section, emptyChangelogEntry.trim())
      logger.warn(
        `No user-visible changes derived for ${nextVersion} — recording the ` +
          `supplied entry: "${emptyChangelogEntry.trim()}".`,
      )
    } else {
      logger.fail(
        [
          `[bump] the CHANGELOG for ${nextVersion} has no user-visible entries.`,
          '',
          '  Every release documents a user-visible change; this one derived',
          '  none. Remedy one of:',
          '',
          `  • add the user-visible changes under "${UNRELEASED_HEADING}" in`,
          `    ${SUBJECT_CHANGELOG_PATH}, then re-run; or`,
          '  • re-run with --empty-changelog-entry "<what changed>" to record',
          '    that one line for this release.',
        ].join('\n'),
      )
      process.exitCode = 1
      return
    }
  }

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

  writeFileSync(
    path.join(rootPath, SUBJECT_MANIFEST_PATH),
    replaceVersion(pkgRaw, nextVersion),
  )
  writeFileSync(changelogPath, insertChangelogSection(baseChangelog, section))
  // Root version mirror — see the file header's deviation 2.
  writeFileSync(
    path.join(rootPath, 'package.json'),
    replaceVersion(rootRaw, nextVersion),
  )

  if (writeOnly) {
    logger.success(
      `Wrote ${SUBJECT_MANIFEST_PATH} + ${SUBJECT_CHANGELOG_PATH} + the ` +
        `root version mirror for ${nextVersion} (--write-only: no commit). ` +
        `The provenance workflow commits these via the GitHub API.`,
    )
    return
  }

  const add = await runCapture(
    'git',
    ['add', SUBJECT_MANIFEST_PATH, SUBJECT_CHANGELOG_PATH, 'package.json'],
    rootPath,
  )
  if (add.code !== 0) {
    logger.fail('git add failed.')
    process.exitCode = 1
    return
  }
  const commit = await runCapture(
    'git',
    [
      'commit',
      '-o',
      SUBJECT_MANIFEST_PATH,
      SUBJECT_CHANGELOG_PATH,
      'package.json',
      '-m',
      `chore: bump version to ${nextVersion}`,
    ],
    rootPath,
  )
  if (commit.code !== 0) {
    logger.fail('git commit failed:')
    logger.fail(commit.stdout)
    process.exitCode = 1
    return
  }
  logger.success(
    `Bumped ${SUBJECT_NAME} to ${nextVersion}. Push, then trigger the ` +
      `publish workflow (stage), then approve locally to promote.`,
  )
}

if (isMainModule(import.meta.url)) {
  main().catch((e: unknown) => {
    logger.error(e)
    process.exitCode = 1
  })
}
