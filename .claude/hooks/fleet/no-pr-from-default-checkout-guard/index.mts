#!/usr/bin/env node
// Claude Code PreToolUse hook — no-pr-from-default-checkout-guard.
//
// HARD-BLOCKS `gh pr create` when the current working directory's checkout is
// sitting on its default branch (current branch === main / master / the
// resolved origin/HEAD default) — EVEN IF `--head` names a feature branch on
// another repo. Running `gh pr create` from a checkout on the default branch is
// the mistake that causes thrash: you must run it from the feature-branch
// worktree. This inspects where the command is RUN FROM; its sibling
// no-pr-from-default-branch-guard inspects the PR HEAD.
//
// Universal safety: fires in NON-fleet repos too — the motivating incident was
// an external PR — so it is NOT gated on fleet membership. The `gh pr create`
// detection uses the shell-quote-backed shell-command.mts parser, NEVER a raw
// regex, so `&&` chains, quoting, and `$(…)` substitution are handled and a
// literal "gh pr create" inside a grep string can't false-fire.
//
// Bypass: `Allow pr-from-default-checkout bypass` in a recent user turn.

import process from 'node:process'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'

import { ownerRepoFromRemoteUrl } from '../_shared/fleet-repos.mts'
import { currentBranch, resolveDefaultBranch } from '../_shared/git-branch.mts'
import { bashGuard, block, defineHook, runHook } from '../_shared/guard.mts'
import { commandsFor } from '../_shared/shell-command.mts'
import { bypassPhrasePresent } from '../_shared/transcript.mts'

import type { Command } from '../_shared/shell-command.mts'

const BYPASS_PHRASE = 'Allow pr-from-default-checkout bypass'

// True when a parsed `gh` segment is a `pr create` / `pr new`. The verb is the
// first two non-flag args after the binary, so `gh repo create` (a different
// subcommand) does not match.
function isGhPrCreateCmd(c: Command): boolean {
  const verbs = c.args.filter(a => !a.startsWith('-'))
  return verbs[0] === 'pr' && (verbs[1] === 'create' || verbs[1] === 'new')
}

// True when the command opens a PR (`gh pr create` / `gh pr new`).
export function isGhPrCreate(command: string): boolean {
  return commandsFor(command, 'gh').some(isGhPrCreateCmd)
}

// The explicit `--repo <value>` / `--repo=<value>` / `-R <value>` target of a
// `gh pr create` in `command`, or undefined when gh would infer the repo from
// the checkout.
export function explicitRepoTarget(command: string): string | undefined {
  for (const c of commandsFor(command, 'gh')) {
    if (!isGhPrCreateCmd(c)) {
      continue
    }
    for (let i = 0, { length } = c.args; i < length; i += 1) {
      const arg = c.args[i]!
      if (arg === '--repo' || arg === '-R') {
        return c.args[i + 1]
      }
      if (arg.startsWith('--repo=')) {
        return arg.slice('--repo='.length)
      }
    }
  }
  return undefined
}

// Case-insensitive `owner/repo` equality between an explicit `--repo` value
// (OWNER/REPO, HOST/OWNER/REPO, or a full URL) and a checkout's origin slug.
export function sameOwnerRepo(target: string, origin: string): boolean {
  const tail = target
    .replace(/\.git$/, '')
    .split('/')
    .filter(Boolean)
    .slice(-2)
    .join('/')
  return tail.toLowerCase() === origin.toLowerCase()
}

// The `owner/repo` of `dir`'s origin remote, or undefined when unresolvable.
function originOwnerRepo(dir: string): string | undefined {
  const r = spawnSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], {
    encoding: 'utf8',
  })
  if (r.status !== 0) {
    return undefined
  }
  /* c8 ignore next - spawnSync with encoding:'utf8' always returns a string stdout */
  return ownerRepoFromRemoteUrl(String(r.stdout ?? '').trim())
}

// True when `branch` is a default-branch checkout — the repo's resolved
// default, or a literal `main`/`master` regardless of what origin/HEAD points
// at (a fresh clone with no origin/HEAD still counts).
export function isDefaultCheckout(
  branch: string,
  defaultBranch: string,
): boolean {
  return branch === defaultBranch || branch === 'main' || branch === 'master'
}

export const hook = defineHook({
  check: bashGuard((command, payload) => {
    if (!isGhPrCreate(command)) {
      return undefined
    }
    const cwd = payload.cwd ?? process.cwd()
    // An explicit `--repo` naming a DIFFERENT repository than this checkout's
    // origin means the cwd checkout is not the PR's source — its branch is
    // irrelevant (the sibling no-pr-from-default-branch-guard still vets the
    // PR head). Only same-repo (or repo-less) invocations are the
    // wrong-checkout mistake this guard exists to stop.
    const explicitRepo = explicitRepoTarget(command)
    if (explicitRepo) {
      const origin = originOwnerRepo(cwd)
      if (origin && !sameOwnerRepo(explicitRepo, origin)) {
        return undefined
      }
    }
    const branch = currentBranch(cwd)
    if (!branch) {
      return undefined
    }
    const defaultBranch = resolveDefaultBranch(cwd)
    if (!isDefaultCheckout(branch, defaultBranch)) {
      return undefined
    }
    if (bypassPhrasePresent(payload.transcript_path, BYPASS_PHRASE)) {
      return undefined
    }
    return block(
      [
        '[no-pr-from-default-checkout-guard] Refusing to open a PR from a checkout on the default branch.',
        '',
        '  What:  gh pr create is running from a checkout sitting on the default branch.',
        `  Where: ${cwd}  (current branch: ${branch} === default: ${defaultBranch})`,
        '  Fix:   Run gh pr create from the FEATURE-branch worktree, not a',
        '         default-branch checkout —',
        '           git switch -c <feature-branch>   # or cd into the feature worktree',
        '           # then re-run gh pr create',
        '',
        `  Bypass: type "${BYPASS_PHRASE}" in a recent message.`,
        '',
      ].join('\n'),
    )
  }),
  event: 'PreToolUse',
  matcher: ['Bash'],
  type: 'guard',
})
void runHook(hook, import.meta.url)
