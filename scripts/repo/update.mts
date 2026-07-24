/*
 * @file Repo update overlay for the fleet dependency-update chain.
 *   socket-registry's release subject carries a generated artifact the
 *   canonical `scripts/fleet/update.mts` knows nothing about:
 *   `registry/manifest.json`, regenerated from each override package's npm
 *   `latest` by `scripts/npm/update-manifest.mts`. Before this overlay the
 *   regeneration was a manual step someone had to remember after every
 *   `pnpm run update`, so the manifest drifted stale between releases.
 *   The `update` package.json script now resolves here — the same
 *   repo-overlay-over-canonical precedence `scripts/repo/bump.mts` uses on
 *   the publish path — and the overlay runs the canonical fleet update
 *   first, then `update-manifest.mts --force`, which writes the manifest and
 *   canonicalizes it through the fleet format step. Code-as-law: a plain
 *   `pnpm run update` can no longer leave the manifest stale.
 *   Usage: node scripts/repo/update.mts [fleet update.mts args…]
 */

import path from 'node:path'
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

import { isMainModule } from '../fleet/_shared/is-main-module.mts'
import { runMain } from '../fleet/_shared/run-main.mts'
import { REPO_ROOT } from '../fleet/paths.mts'

const logger = getDefaultLogger()

/**
 * Run a node script with inherited stdio; false + propagated exit code on
 * failure instead of a throw, mirroring the canonical update's run helper.
 */
async function run(script: string, args: readonly string[]): Promise<boolean> {
  try {
    await spawn(process.execPath, [script, ...args], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    })
    return true
  } catch (e) {
    const code = (e as { code?: number | undefined }).code
    process.exitCode = typeof code === 'number' && code !== 0 ? code : 1
    return false
  }
}

export async function main(): Promise<number> {
  const canonical = path.join(REPO_ROOT, 'scripts', 'fleet', 'update.mts')
  if (!(await run(canonical, process.argv.slice(2)))) {
    logger.fail(
      'update: canonical fleet update failed — skipping registry/manifest.json regeneration.',
    )
    return process.exitCode === 0 ? 1 : Number(process.exitCode)
  }
  // Pass 7, repo-owned: regenerate registry/manifest.json from npm latest.
  // --force bypasses the modified-files early exit — the update above may have
  // bumped only catalogs/lockfile, while the manifest tracks the REGISTRY's
  // latest published versions, which can move without any local file change.
  logger.info('update: regenerating registry/manifest.json from npm latest…')
  const manifestScript = path.join(
    REPO_ROOT,
    'scripts',
    'npm',
    'update-manifest.mts',
  )
  if (!(await run(manifestScript, ['--force']))) {
    logger.fail('update: registry/manifest.json regeneration failed.')
    return process.exitCode === 0 ? 1 : Number(process.exitCode)
  }
  return 0
}

if (isMainModule(import.meta.url)) {
  runMain(main)
}
