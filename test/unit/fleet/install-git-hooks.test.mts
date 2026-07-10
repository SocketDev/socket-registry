// vitest specs for scripts/fleet/install-git-hooks.mts.
//
// The installer is invoked from `prepare` at `pnpm install` time. Its
// job: set `core.hooksPath = .git-hooks` in the local git config
// when run inside a git checkout that has a `.git-hooks/` dir.
// Replaces husky's auto-install side effect with a 60-LOC dependency-free
// script.
//
// Each test spawns the installer in a tmpdir with a controlled
// .git/ + .git-hooks/ layout, then inspects the resulting
// core.hooksPath value via `git config`. Idempotency is verified by
// running the installer twice and confirming the second run is silent.
//
// The installer resolves REPO_ROOT by walking up from its own
// `import.meta.url` to the nearest `package.json` (not `process.cwd()`), so
// each test COPIES install-git-hooks.mts into `<tmpdir>/scripts/` AND writes a
// `package.json` at `<tmpdir>/` — that manifest is what the walk stops at, so
// REPO_ROOT === tmpdir regardless of how deep the copy sits. Running the
// original script in the wheelhouse/fleet repo would resolve REPO_ROOT to the
// real repo and write to the real git config instead of the tmpdir.

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE_SCRIPT = path.join(
  here,
  '..',
  '..',
  '..',
  'scripts',
  'fleet',
  'install-git-hooks.mts',
)

interface TmpRepo {
  /**
   * Absolute path to the tmpdir; serves as the repo root the installer sees.
   */
  readonly dir: string
  /**
   * Copy of install-git-hooks.mts under <dir>/scripts/ — what each test spawns.
   */
  readonly installerPath: string
  /**
   * Where the installer expects to find / will write `core.hooksPath` -> here.
   */
  readonly hooksDir: string
  readonly cleanup: () => void
}

function makeTmpRepo(): TmpRepo {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'install-git-hooks-test-'))
  // A `package.json` at the tmpdir root is the marker the installer's
  // resolveRepoRoot() walk stops at, so REPO_ROOT === dir. The copy's depth
  // under `<dir>/` no longer matters (the walk is package.json-anchored, not a
  // `..` count), but mirror the real `scripts/` layout anyway.
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'install-git-hooks-test-fixture', private: true }) +
      '\n',
  )
  const scriptsDir = path.join(dir, 'scripts')
  mkdirSync(scriptsDir, { recursive: true })
  const installerPath = path.join(scriptsDir, 'install-git-hooks.mts')
  copyFileSync(SOURCE_SCRIPT, installerPath)
  // The copied installer imports @socketsecurity/lib-stable; ESM resolution
  // (which ignores NODE_PATH) walks up from <dir>/scripts/ for node_modules.
  // Symlink the running repo's node_modules into the sandbox so the import
  // resolves without a real install.
  symlinkSync(
    path.join(here, '..', '..', '..', 'node_modules'),
    path.join(dir, 'node_modules'),
    'dir',
  )
  // Construct once; tests reference `repo.hooksDir` everywhere they need it.
  // The installer sets `core.hooksPath = .git-hooks` (the root, where the
  // per-hook dispatchers live and run fleet/ then repo/); create that dir so
  // existsSync(...) succeeds in tests that mkdir hooksDir.
  const hooksDir = path.join(dir, '.git-hooks')
  return {
    dir,
    installerPath,
    hooksDir,
    cleanup: () => {
      rmSync(dir, { force: true, recursive: true })
    },
  }
}

const LEAKY_GIT_VARS: readonly string[] = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CEILING_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_DIR',
  'GIT_INDEX_FILE',
  'GIT_NAMESPACE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_PREFIX',
  'GIT_WORK_TREE',
]

// Strip the repo-pointing git env vars from a spawn's environment. When
// this suite runs inside the pre-commit hook, git exports GIT_DIR /
// GIT_WORK_TREE (etc.) pointing at THE REAL repo — so `git init <dir>`,
// the `--local` config reads, and the spawned installer (which probes for
// a `.git` dir to decide whether to skip) would all resolve to the live
// repo instead of the temp fixture, breaking the "skips when .git absent"
// cases. Each git-touching spawn runs with this cleaned env so it can only
// ever see the fixture dir.
function cleanGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  for (let i = 0, { length } = LEAKY_GIT_VARS; i < length; i += 1) {
    delete env[LEAKY_GIT_VARS[i]!]
  }
  env['GIT_CONFIG_GLOBAL'] = '/dev/null'
  env['GIT_CONFIG_SYSTEM'] = '/dev/null'
  return env
}

// Initialize an empty git repo at dir. Uses `git init` so the .git
// directory has the same shape git itself expects (objects/, refs/,
// HEAD, …). Inheriting the user's git config could pollute the local
// `core.hooksPath` we're trying to inspect, so the test config sets a
// minimal identity and disables `core.hooksPath` inheritance via
// --local writes only.
function gitInit(dir: string): void {
  const r = spawnSync('git', ['init', '--quiet', dir], { env: cleanGitEnv() })
  assert.strictEqual(r.status, 0, `git init failed: ${r.stderr}`)
}

function readLocalConfig(dir: string, key: string): string | undefined {
  const r = spawnSync('git', ['-C', dir, 'config', '--local', '--get', key], {
    env: cleanGitEnv(),
  })
  return r.status === 0 ? String(r.stdout).trim() : undefined
}

function runInstaller(
  installerPath: string,
  cwd: string,
): { code: number; stderr: string } {
  const r = spawnSync(process.execPath, [installerPath], {
    cwd,
    env: cleanGitEnv(),
  })
  return { code: r.status ?? 0, stderr: r.stderr ? String(r.stderr) : '' }
}

test('install-git-hooks: sets core.hooksPath when .git + .git-hooks both present', () => {
  const repo = makeTmpRepo()
  try {
    gitInit(repo.dir)
    mkdirSync(repo.hooksDir, { recursive: true })
    writeFileSync(path.join(repo.hooksDir, 'pre-commit'), '#!/bin/sh\nexit 0\n')

    const result = runInstaller(repo.installerPath, repo.dir)
    assert.strictEqual(result.code, 0, `installer stderr: ${result.stderr}`)
    assert.strictEqual(
      readLocalConfig(repo.dir, 'core.hooksPath'),
      '.git-hooks',
    )
  } finally {
    repo.cleanup()
  }
})

test('install-git-hooks: idempotent — second run is a silent no-op', () => {
  const repo = makeTmpRepo()
  try {
    gitInit(repo.dir)
    mkdirSync(repo.hooksDir, { recursive: true })

    const first = runInstaller(repo.installerPath, repo.dir)
    assert.strictEqual(first.code, 0)
    assert.strictEqual(
      readLocalConfig(repo.dir, 'core.hooksPath'),
      '.git-hooks',
    )

    const second = runInstaller(repo.installerPath, repo.dir)
    assert.strictEqual(second.code, 0)
    // Still set, still pointing at .git-hooks.
    assert.strictEqual(
      readLocalConfig(repo.dir, 'core.hooksPath'),
      '.git-hooks',
    )
    // Second run produced no stderr (truly silent on the no-op path).
    assert.strictEqual(second.stderr.trim(), '')
  } finally {
    repo.cleanup()
  }
})

test('install-git-hooks: skips when .git dir is absent (e.g. tarball install)', () => {
  const repo = makeTmpRepo()
  try {
    // No `git init` — just create .git-hooks/ alone.
    mkdirSync(repo.hooksDir, { recursive: true })

    const result = runInstaller(repo.installerPath, repo.dir)
    assert.strictEqual(result.code, 0)
    // No config to inspect — the dir isn't a git repo.
    assert.strictEqual(readLocalConfig(repo.dir, 'core.hooksPath'), undefined)
  } finally {
    repo.cleanup()
  }
})

test('install-git-hooks: skips when .git-hooks dir is absent (pre-cascade state)', () => {
  const repo = makeTmpRepo()
  try {
    gitInit(repo.dir)
    // No .git-hooks dir.

    const result = runInstaller(repo.installerPath, repo.dir)
    assert.strictEqual(result.code, 0)
    // Installer bowed out before writing config.
    assert.strictEqual(readLocalConfig(repo.dir, 'core.hooksPath'), undefined)
  } finally {
    repo.cleanup()
  }
})
