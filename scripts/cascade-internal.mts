#!/usr/bin/env node
/**
 * @fileoverview Recursively bump stale internal SHA pins to HEAD.
 *
 * socket-registry's `.github/actions/` and `.github/workflows/` files
 * pin each other by absolute SHA. When you commit a change, every pin
 * to a path that change touched is now stale (points at an older SHA
 * that doesn't include your change). The bump itself creates a new
 * commit, which may make further pins stale, and so on.
 *
 * This script does the bump-until-stable in one command.
 *
 * Usage:
 *   git commit -m "fix(setup): ..."
 *   node scripts/cascade-internal.mts
 *
 *   # Preview without committing:
 *   node scripts/cascade-internal.mts --dry-run
 *
 * Pre-flight: working tree must be clean (commit your change first).
 * Cascade commits land on the current branch; safe to run from a
 * release branch or PR branch as well as main.
 *
 * The scan uses one regex
 * `SocketDev/socket-registry(<path>)@<40-hex>` — third-party action
 * pins (actions/checkout, etc.) are untouched. A pin is "stale" when
 * its referenced subtree has changed between its pinned SHA and HEAD;
 * `git diff` decides this so we never bump pins to subtrees that
 * didn't change.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// One regex captures the pin path + SHA. The path group is the suffix
// after `socket-registry`, including the leading `/`, so a pin like
// `SocketDev/socket-registry/.github/actions/setup@<sha>` yields
// pinPath=`/.github/actions/setup`. We trim the leading `/` before
// using it as a `git diff` path argument.
const PIN_RE = /SocketDev\/socket-registry(\/[^@\s]+)@([a-f0-9]{40})/g

function git(...args: string[]): string {
  const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' })
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr.trim()}`)
  }
  return r.stdout.trim()
}

async function walkYaml(dir: string): Promise<string[]> {
  const out: string[] = []
  if (!existsSync(dir)) {
    return out
  }
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...(await walkYaml(p)))
    } else if (e.name.endsWith('.yml') || e.name.endsWith('.yaml')) {
      out.push(p)
    }
  }
  return out
}

interface Pin {
  file: string
  pinPath: string
  sha: string
  shaStart: number
}

async function scanPins(): Promise<Pin[]> {
  const files = await walkYaml(path.join(REPO_ROOT, '.github'))
  const pins: Pin[] = []
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8')
    PIN_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = PIN_RE.exec(text)) !== null) {
      pins.push({
        file,
        pinPath: m[1]!.replace(/^\//, ''),
        sha: m[2]!,
        shaStart: m.index + m[0].length - m[2]!.length,
      })
    }
  }
  return pins
}

// A pin is stale when the subtree it references differs between its
// pinned SHA and HEAD. `git diff --quiet <sha> HEAD -- <pinPath>`
// returns 0 (no diff) or 1 (diff). Anything else is an error.
function isStale(pin: Pin, head: string): boolean {
  if (pin.sha === head) {
    return false
  }
  const r = spawnSync(
    'git',
    ['diff', '--quiet', pin.sha, head, '--', pin.pinPath],
    { cwd: REPO_ROOT },
  )
  if (r.status === 0) {
    return false
  }
  if (r.status === 1) {
    return true
  }
  throw new Error(
    `git diff ${pin.sha.slice(0, 8)} HEAD -- ${pin.pinPath} exited ${r.status}`,
  )
}

async function rewriteFile(file: string, pinsInFile: Pin[], head: string): Promise<void> {
  let text = await fs.readFile(file, 'utf8')
  // Rewrite right-to-left so earlier offsets remain valid.
  for (const pin of [...pinsInFile].sort((a, b) => b.shaStart - a.shaStart)) {
    text = text.slice(0, pin.shaStart) + head + text.slice(pin.shaStart + 40)
  }
  await fs.writeFile(file, text)
}

async function runIteration(dryRun: boolean): Promise<{ commits: number; converged: boolean }> {
  const head = git('rev-parse', 'HEAD')
  const pins = await scanPins()
  const stale = pins.filter(p => isStale(p, head))
  if (stale.length === 0) {
    return { commits: 0, converged: true }
  }
  const byFile = new Map<string, Pin[]>()
  for (const p of stale) {
    const arr = byFile.get(p.file)
    if (arr) {
      arr.push(p)
    } else {
      byFile.set(p.file, [p])
    }
  }
  const relFiles = [...byFile.keys()].map(f => path.relative(REPO_ROOT, f)).sort()
  const pinPaths = [...new Set(stale.map(p => p.pinPath))].sort()
  console.log(`  bumping ${stale.length} stale pins across ${byFile.size} files → ${head.slice(0, 8)}`)
  for (const p of pinPaths) {
    console.log(`    ${p}`)
  }
  if (dryRun) {
    return { commits: 0, converged: false }
  }
  for (const [file, pinsInFile] of byFile) {
    await rewriteFile(file, pinsInFile, head)
  }
  for (const f of relFiles) {
    git('add', f)
  }
  const subject =
    pinPaths.length === 1
      ? pinPaths[0]!
      : `${pinPaths[0]!} (+${pinPaths.length - 1} more)`
  git(
    '-c',
    'core.commentChar=;',
    'commit',
    '-m',
    `chore(ci): cascade pins to ${head.slice(0, 8)} (${subject})\n\n` +
      pinPaths.map(p => `  ${p}`).join('\n') +
      `\n\nGenerated by scripts/cascade-internal.mts.`,
  )
  return { commits: 1, converged: false }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node scripts/cascade-internal.mts [--dry-run]')
    return
  }
  if (git('status', '--porcelain').length > 0) {
    throw new Error('working tree is dirty — commit your change first')
  }

  let total = 0
  for (;;) {
    const { commits, converged } = await runIteration(dryRun)
    total += commits
    if (converged) {
      console.log(total === 0 ? 'No stale pins.' : `Converged after ${total} cascade commits.`)
      return
    }
    if (dryRun) {
      console.log('(dry-run: stopping after one iteration — pins would converge over multiple commits)')
      return
    }
  }
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e)
  console.error(`cascade-internal: ${msg}`)
  process.exitCode = 1
})
