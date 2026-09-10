import path from 'node:path'

import { gt } from '@socketsecurity/lib-stable/versions/compare'

import { hasChangelogVersionSection } from '../../fleet/changelog/sections.mts'

/**
 * The release subject: the ONE published package this monorepo releases
 * through the fleet npm-publish path. Repo-relative paths so the shared
 * anchor chain's `git show <ref>:<path>` probes resolve.
 */
export const SUBJECT_NAME = '@socketsecurity/registry'
export const SUBJECT_MANIFEST_PATH = 'registry/package.json'
export const SUBJECT_CHANGELOG_PATH = 'registry/CHANGELOG.md'

export interface ManifestShape {
  name?: string | undefined
  private?: boolean | undefined
  publishConfig?: { directory?: string | undefined } | undefined
  repository?: { url?: string | undefined } | string | undefined
  version?: string | undefined
}

/**
 * The publish-wiring invariant the staged leg depends on, as a pure check:
 * the root manifest must be `private: true` — never itself publishable — and
 * must redirect `pnpm stage publish` at the repo root into the subject via
 * `publishConfig.directory`. Returns the failure text, or undefined when the
 * wiring holds.
 */
export function subjectWiringError(rootPkg: ManifestShape): string | undefined {
  const expectedDirectory = path.dirname(SUBJECT_MANIFEST_PATH)
  if (rootPkg.private !== true) {
    return (
      `root package.json must stay "private": true — the monorepo root is ` +
      `never published; the release subject is ${SUBJECT_NAME} at ` +
      `${SUBJECT_MANIFEST_PATH}.`
    )
  }
  if (rootPkg.publishConfig?.directory !== expectedDirectory) {
    return (
      `root package.json is missing publishConfig.directory: ` +
      `"${expectedDirectory}". The cascade-owned npm-publish.mts --staged ` +
      `runs \`pnpm stage publish\` from the REPO ROOT, and pnpm does not ` +
      `refuse a private manifest on that path — without the redirect the ` +
      `staged leg uploads the PRIVATE ROOT instead of ${SUBJECT_NAME}. ` +
      `Restore the publishConfig block before releasing.`
    )
  }
  return undefined
}

/**
 * The prepared-release target: when the subject manifest already reads a
 * version AHEAD of the released base and the subject changelog already
 * carries that version's section, a bump commit prepared that release — the
 * manifest version is the target, like a committed `-prerelease` hint. A
 * manifest merely ahead WITHOUT its changelog section is not a prepared
 * release — that is the pre-bump drift resolveBumpBase exists to neutralize —
 * and a major jump still requires the explicit human `--release-as major`.
 * Returns undefined when no prepared release applies. Pure.
 */
export function preparedVersionFrom(config: {
  base: string
  changelog: string
  manifestVersion: string
}): string | undefined {
  const cfg = { __proto__: null, ...config } as {
    base: string
    changelog: string
    manifestVersion: string
  }
  const { base, changelog, manifestVersion } = cfg
  if (!/^\d+\.\d+\.\d+$/.test(manifestVersion)) {
    return undefined
  }
  if (!gt(manifestVersion, base)) {
    return undefined
  }
  if (manifestVersion.split('.')[0] !== base.split('.')[0]) {
    return undefined
  }
  if (!hasChangelogVersionSection(changelog, manifestVersion)) {
    return undefined
  }
  return manifestVersion
}
