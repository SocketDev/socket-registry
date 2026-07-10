/**
 * @file Regression guard for the fleet-wide auto-wiring of the AI-attribution
 *   commit guard. The guard protects every fleet repo automatically only
 *   because two canonical artifacts are in place: the template `settings.json`
 *   routes Bash tool calls through the fleet dispatcher, and the dispatch
 *   manifest registers `commit-message-format-guard` (which carries the
 *   AI-attribution check) under that Bash group. The standard setup propagates
 *   `settings.json` to every target (merge-aware fixer) and sets
 *   `core.hooksPath` (`install-git-hooks.mts`, exercised by its own spec), so
 *   if either artifact loses the wiring the protection silently stops shipping.
 *   These assertions fail the moment that happens.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

const REPO_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

// In the wheelhouse the canonical template settings is the authority; a fleet
// member carries no template/ — its cascaded live .claude/settings.json holds
// the same wiring, so the invariant is asserted against whichever exists.
const TEMPLATE_SETTINGS = path.join(
  REPO_ROOT,
  'template',
  'base',
  '.claude',
  'settings.json',
)
const SETTINGS_FILE = existsSync(TEMPLATE_SETTINGS)
  ? TEMPLATE_SETTINGS
  : path.join(REPO_ROOT, '.claude', 'settings.json')
const DISPATCH_MANIFEST = path.join(
  REPO_ROOT,
  '.claude',
  'hooks',
  'fleet',
  '_shared',
  'dispatch-manifest.json',
)

const GUARD_PATH = 'fleet/commit-message-format-guard/index.mts'

interface HookEntry {
  readonly type?: string | undefined
  readonly command: string
}
interface HookGroup {
  readonly matcher?: string | undefined
  readonly hooks?: readonly HookEntry[] | undefined
}
interface Settings {
  readonly hooks?:
    | { readonly [event: string]: readonly HookGroup[] }
    | undefined
}

type ManifestHook =
  | string
  | { readonly path: string; readonly triggers?: readonly string[] | undefined }
interface ManifestGroup {
  readonly matcher: string
  readonly hooks: readonly ManifestHook[]
}
type Manifest = { readonly [event: string]: readonly ManifestGroup[] }

function read<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

describe('AI-attribution guard is auto-wired fleet-wide', () => {
  test('settings.json routes Bash PreToolUse through the dispatcher', () => {
    const settings = read<Settings>(SETTINGS_FILE)
    const preToolUse = settings.hooks?.['PreToolUse'] ?? []
    const dispatcherGroup = preToolUse.find(group =>
      (group.hooks ?? []).some(h =>
        h.command.includes('_dispatch/index.cjs PreToolUse'),
      ),
    )
    assert.ok(
      dispatcherGroup,
      'no PreToolUse group runs the _dispatch compile-cache loader — every target would skip the fleet guards',
    )
    assert.ok(
      (dispatcherGroup.matcher ?? '').split('|').includes('Bash'),
      `the dispatcher matcher must include Bash so git-commit tool calls reach the guards; got "${dispatcherGroup.matcher}"`,
    )
  })

  test('dispatch manifest registers commit-message-format-guard under Bash', () => {
    const manifest = read<Manifest>(DISPATCH_MANIFEST)
    const bashGroup = (manifest['PreToolUse'] ?? []).find(
      group => group.matcher === 'Bash',
    )
    assert.ok(bashGroup, 'no PreToolUse Bash group in the dispatch manifest')
    const entry = bashGroup.hooks.find(
      h => (typeof h === 'string' ? h : h.path) === GUARD_PATH,
    )
    assert.ok(
      entry,
      `${GUARD_PATH} (which carries the AI-attribution check) is not registered under the Bash group`,
    )
    // The guard is trigger-gated on "commit" — git-commit commands always
    // contain that token, so the gate never hides a real commit from the check.
    const triggers = typeof entry === 'string' ? undefined : entry.triggers
    assert.ok(
      triggers === undefined || triggers.includes('commit'),
      `the guard's trigger gate must include "commit" or be ungated; got ${JSON.stringify(triggers)}`,
    )
  })
})
