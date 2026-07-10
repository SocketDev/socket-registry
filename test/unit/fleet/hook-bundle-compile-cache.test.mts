// socket-lint: mirror-exempt — tests the committed bundle.cjs artifact, not a source module
// vitest spec proving the fleet hook bundle's V8 compile cache is actually
// created and flushed: spawn a loader that mirrors the committed _dispatch/
// index.cjs (enableCompileCache + require the committed bundle.cjs) for an
// event, then assert the cache dir is populated (file count > 0). Without that
// file count the compile-cache claim is unproven, so this test is the gate on
// the whole feature — and on the compile-cache fail-open path the snapshot
// launcher falls back to.
//
// It runs against the COMMITTED bundle.cjs (the production artifact settings.json
// invokes via index.cjs), NOT an inline rebuild: the production bundle is built
// by hook-bundle.config.mts with `codeSplitting: false` PLUS the lazy-semver
// stub + acorn co-location, and a minimal inline rolldown can't reproduce those
// (it dies on the circular `comparator → SemVer` init — `SemVer is not a
// constructor`). Testing the real artifact is both more faithful and avoids
// re-implementing the config.
//
// See docs/agents.md/fleet/hook-bundle.md.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'

import { REPO_ROOT } from '../../../scripts/fleet/paths.mts'

const dispatchDir = path.join(
  REPO_ROOT,
  '.claude',
  'hooks',
  'fleet',
  '_dispatch',
)

/**
 * Count regular files anywhere under dir (recursively). 0 when dir is missing.
 */
function countFiles(dir: string): number {
  if (!existsSync(dir)) {
    return 0
  }
  let total = 0
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, dirent.name)
    if (dirent.isDirectory()) {
      total += countFiles(full)
    } else if (dirent.isFile()) {
      total += 1
    }
  }
  return total
}

describe('hook-bundle compile cache', () => {
  test('the .cjs loader populates the compile-cache dir for an event', () => {
    const bundlePath = path.join(dispatchDir, 'bundle.cjs')
    if (!existsSync(bundlePath)) {
      // The committed production bundle is only present after a dogfood cascade;
      // in a template-only checkout there is nothing to require. Skip, don't fail.
      return
    }
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'hook-bundle-cache-'))
    try {
      const cacheDir = path.join(tmp, 'cache')
      const loaderPath = path.join(tmp, 'loader.cjs')
      // Mirror _dispatch/index.cjs: enable the compile cache at cacheDir, then
      // require the COMMITTED bundle.cjs (absolute path so the loader resolves it
      // from any cwd). The require must be BELOW enableCompileCache — the cache
      // only captures modules required after it turns on.
      writeFileSync(
        loaderPath,
        [
          `'use strict'`,
          `require('node:module').enableCompileCache(${JSON.stringify(cacheDir)})`,
          `require(${JSON.stringify(bundlePath)})`,
          ``,
        ].join('\n'),
      )

      const result = spawnSync('node', [loaderPath, 'PostToolUse'], {
        encoding: 'utf8',
        input: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_input: { command: 'ls' },
          tool_name: 'Bash',
        }),
      })
      assert.equal(
        result.status,
        0,
        `loader should exit 0; stderr: ${String(result.stderr ?? '')}`,
      )

      const cacheFileCount = countFiles(cacheDir)
      assert.ok(
        cacheFileCount > 0,
        `expected the V8 compile-cache dir to be populated (files > 0), saw ${cacheFileCount}. ` +
          `A type-stripped .mts loader leaves 0 here; a plain CJS bundle must flush.`,
      )
    } finally {
      rmSync(tmp, { force: true, recursive: true })
    }
  })
})
