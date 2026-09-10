import { writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { gt } from '@socketsecurity/lib-stable/versions/compare'
import { replaceVersion } from '../fleet/bump/manifest-write.mts'
import {
  changelogCommitBumpLevel,
  changelogVersionHint,
  nextChangelogVersion,
} from '../fleet/changelog/commits.mts'
import type { BumpLevel } from '../fleet/changelog/commits.mts'
import {
  changelogHeading,
  changelogSectionHasEntries,
  composeChangelogSectionFromCommits,
  promoteChangelogUnreleasedSection,
  UNRELEASED_HEADING,
  withChangelogEntry,
} from '../fleet/changelog/compose.mts'
import { changelogRepoUrl } from '../fleet/changelog/links.mts'
import {
  hasChangelogVersionSection,
  insertChangelogVersionSection,
} from '../fleet/changelog/sections.mts'
import { describeAnchor } from '../fleet/lib/release-anchor.mts'
import { REPO_ROOT } from '../fleet/paths.mts'
import { runCapture } from '../fleet/registry-infra/shared.mts'
import {
  preparedVersionFrom,
  SUBJECT_CHANGELOG_PATH,
  SUBJECT_MANIFEST_PATH,
  SUBJECT_NAME,
} from './util/bump-subject.mts'
import type {
  deriveSubjectRelease,
  readManifest,
} from './util/bump-subject.mts'
const logger = getDefaultLogger()
const rootPath = REPO_ROOT
type Derivation = NonNullable<Awaited<ReturnType<typeof deriveSubjectRelease>>>
type Manifest = ReturnType<typeof readManifest>['parsed']
export function resolveBumpVersion(
  releaseAs: unknown,
  manifestVersion: string,
  existingChangelog: string,
  derivation: Derivation,
) {
  const { anchor, base, commits } = derivation
  // Version resolution, most-explicit first: --release-as, then a committed
  // `X.Y.Z-prerelease` hint, then a PREPARED RELEASE — manifest ahead of base
  // with its changelog section already committed — then the commit-type
  // heuristic. MAJOR is never derived.
  const hinted = changelogVersionHint(manifestVersion)
  const prepared = preparedVersionFrom({
    base,
    changelog: existingChangelog,
    manifestVersion: manifestVersion,
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
        `Version hint ${manifestVersion} names ${hinted}, a MAJOR jump past the ` +
          `last released version ${base} — a major requires the explicit ` +
          `--release-as major signal, not a hint.`,
      )
      process.exitCode = 1
      return
    }
    if (!gt(hinted, base)) {
      logger.fail(
        `Version hint ${manifestVersion} names ${hinted}, which is not ahead of ` +
          `the last released version ${base} — it would re-publish or move ` +
          `backward. Name a version greater than ${base}.`,
      )
      process.exitCode = 1
      return
    }
    namedVersion = hinted
    level = 'patch'
    logger.log(
      `Version hint found: ${manifestVersion} → releasing as ${hinted} ` +
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
    level = changelogCommitBumpLevel(commits)
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

  const nextVersion = namedVersion ?? nextChangelogVersion(base, level)
  return { __proto__: null, level, nextVersion }
}
export async function reconcileAppliedBump(context: {
  existingChangelog: string
  nextVersion: string
  pkg: Manifest
  rootPkg: Manifest
  rootRaw: string
  dryRun: boolean
  writeOnly: boolean
}): Promise<boolean> {
  const {
    existingChangelog,
    nextVersion,
    pkg,
    rootPkg,
    rootRaw,
    dryRun,
    writeOnly,
  } = context
  // Bump-exactly-once re-entry: the subject already carries the section and
  // the version. The only thing possibly left is the root version mirror —
  // complete it instead of failing, so a half-synced tree self-heals.
  if (hasChangelogVersionSection(existingChangelog, nextVersion)) {
    if (pkg.version === nextVersion) {
      if (rootPkg.version === nextVersion) {
        logger.success(
          `Bump already applied: ${SUBJECT_MANIFEST_PATH} reads ` +
            `${nextVersion}, ${SUBJECT_CHANGELOG_PATH} has its section, and ` +
            `the root version mirror matches — nothing to write.`,
        )
        return true
      }
      if (dryRun) {
        logger.success(
          `Dry-run: bump already applied for ${nextVersion}; would sync the ` +
            `root version mirror (${rootPkg.version} → ${nextVersion}).`,
        )
        return true
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
        return true
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
        return true
      }
      logger.success(
        `Bump already applied for ${nextVersion}; committed the root ` +
          `version mirror sync.`,
      )
      return true
    }
    logger.fail(
      `${SUBJECT_CHANGELOG_PATH} already has a ${nextVersion} section but ` +
        `${SUBJECT_MANIFEST_PATH} reads ${pkg.version} — a half-applied ` +
        `bump.\n  Fix: reconcile the manifest with the changelog — or ` +
        `remove the stale section — then re-run.`,
    )
    process.exitCode = 1
    return true
  }

  return false
}
export function composeBumpSection(context: {
  nextVersion: string
  date: string
  repositoryUrl: string | undefined
  existingChangelog: string
  commits: Derivation['commits']
  emptyChangelogEntry: unknown
}) {
  const {
    nextVersion,
    date,
    repositoryUrl,
    existingChangelog,
    commits,
    emptyChangelogEntry,
  } = context
  const versionHeading = changelogHeading(
    nextVersion,
    date,
    changelogRepoUrl(repositoryUrl),
  )
  const promoted = promoteChangelogUnreleasedSection(
    existingChangelog,
    versionHeading,
  )
  let section = promoted
    ? promoted.section
    : composeChangelogSectionFromCommits({
        commits,
        date,
        repoUrl: changelogRepoUrl(repositoryUrl),
        version: nextVersion,
      })
  const baseChangelog = promoted ? promoted.changelog : existingChangelog

  if (!changelogSectionHasEntries(section)) {
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

  return { __proto__: null, section, baseChangelog, promoted }
}

export async function writeBumpChanges(context: {
  nextVersion: string
  pkgRaw: string
  rootRaw: string
  changelogPath: string
  baseChangelog: string
  section: string
  writeOnly: boolean
}): Promise<void> {
  const {
    nextVersion,
    pkgRaw,
    rootRaw,
    changelogPath,
    baseChangelog,
    section,
    writeOnly,
  } = context
  writeFileSync(
    path.join(rootPath, SUBJECT_MANIFEST_PATH),
    replaceVersion(pkgRaw, nextVersion),
  )
  writeFileSync(
    changelogPath,
    insertChangelogVersionSection(baseChangelog, section),
  )
  // Root version mirror.
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
