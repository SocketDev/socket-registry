/**
 * @file Wires an npm override's port provenance. For a package under
 *   `packages/npm/<name>` it writes the three machine-owned records described
 *   in docs/agents.md/repo/npm-port-provenance.md — the `.gitmodules` upstream
 *   pin (shallow, single-branch, sparse `test/`, `ref` + `sha256:` stamped via
 *   gen/gitmodules-hash), the `file-fork` row in `.config/repo/lockstep.json`,
 *   and the `test/npm/package.json` dependency spec — then materializes the
 *   upstream reference and prints the `@file` header for the hand-ported
 *   suite. The provenance gate stays red until that suite exists; wire and
 *   port land together.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { UTF8 } from '@socketsecurity/lib-stable/constants/encoding'
import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { isDirEmptySync } from '@socketsecurity/lib-stable/fs/inspect'
import { httpJson } from '@socketsecurity/lib-stable/http-request'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { naturalCompare } from '@socketsecurity/lib-stable/sorts/natural'
// @socketsecurity/lib-stable has no ./external/semver export at the pinned
// version; semver is a devDependency (scripts/tests only, not bundled).
// oxlint-disable-next-line socket/prefer-stable-external-semver -- dev dep
import semver from 'semver'

import { isMainModule } from '../../fleet/_shared/is-main-module.mts'
import { NPM_PACKAGES_PATH, ROOT_PATH } from '../constants/paths.mts'

const logger = getDefaultLogger()

const GITMODULES_PATH = path.join(ROOT_PATH, '.gitmodules')
const LOCKSTEP_PATH = path.join(ROOT_PATH, '.config/repo/lockstep.json')
const TEST_NPM_PKG_JSON_PATH = path.join(ROOT_PATH, 'test/npm/package.json')
const UPSTREAM_TEST_CANDIDATES = [
  'test/tests.js',
  'test/test.js',
  'test/index.js',
]

const STANDARD_DEVIATIONS = [
  "swap tape's `test(name, t => …)` harness for vitest `describe`/`it`",
  'swap `t.equal`/`t.ok` assertions for `expect(…).toBe`/`toEqual`',
]

interface UpstreamRepo {
  owner: string
  repo: string
  url: string
}

interface TagPin {
  tag: string
  version: string
  objectSha: string
  peeledSha: string | undefined
}

export function parseRepositoryUrl(rawUrl: string): UpstreamRepo | undefined {
  // github.com followed by `/` or `:` (https vs ssh), then owner (no `/`),
  // `/`, then repo (stops at `/`, `#`, or whitespace; `.git` stripped below).
  const match = /github\.com[/:]([^/]+)\/([^/#\s]+)/.exec(rawUrl)
  if (!match) {
    return undefined
  }
  const owner = match[1]!
  const repo = match[2]!.replace(/\.git$/, '')
  return { owner, repo, url: `https://github.com/${owner}/${repo}.git` }
}

export async function gitLsRemoteTags(
  url: string,
): Promise<Map<string, string>> {
  const result = await spawn('git', ['ls-remote', '--tags', url], {
    cwd: ROOT_PATH,
  })
  const refs = new Map<string, string>()
  const lines = String(result.stdout).split('\n')
  for (let i = 0, { length } = lines; i < length; i += 1) {
    const [sha, ref] = lines[i]!.split('\t')
    if (sha && ref?.startsWith('refs/tags/')) {
      refs.set(ref.slice('refs/tags/'.length), sha)
    }
  }
  return refs
}

export async function resolveTagPin(
  url: string,
  explicitTag: string | undefined,
): Promise<TagPin> {
  const refs = await gitLsRemoteTags(url)
  const releaseTags = [...refs.keys()]
    .filter(t => !t.endsWith('^{}') && semver.valid(t.replace(/^v/, '')))
    .toSorted((a, b) =>
      semver.compare(a.replace(/^v/, ''), b.replace(/^v/, '')),
    )
  const tag = explicitTag ?? releaseTags.at(-1)
  if (!tag || !refs.has(tag)) {
    throw new Error(
      [
        `What: no usable release tag for the upstream pin.`,
        `Where: ${url}`,
        `Saw: ${explicitTag ? `requested tag \`${explicitTag}\` not in ls-remote output` : `${releaseTags.length} semver tags`}; wanted a vX.Y.Z release tag.`,
        'Fix: pass --tag <tag> with a tag that exists upstream (git ls-remote --tags <url>).',
      ].join('\n'),
    )
  }
  return {
    tag,
    version: tag.replace(/^v/, ''),
    objectSha: refs.get(tag)!,
    peeledSha: refs.get(`${tag}^{}`),
  }
}

export function submoduleKeyFor(upstream: UpstreamRepo): string {
  return `${upstream.owner}-${upstream.repo}`
}

export async function appendGitmodulesBlock(
  upstream: UpstreamRepo,
  pin: TagPin,
  options?: { dryRun?: boolean | undefined },
): Promise<boolean> {
  const { dryRun = false } = { __proto__: null, ...options } as NonNullable<
    typeof options
  >
  const key = submoduleKeyFor(upstream)
  const submodulePath = `upstream/${key}`
  const content = existsSync(GITMODULES_PATH)
    ? await fs.readFile(GITMODULES_PATH, UTF8)
    : ''
  if (content.includes(`[submodule "${submodulePath}"]`)) {
    logger.log(
      `.gitmodules already has ${submodulePath}; leaving the pin as is.`,
    )
    return false
  }
  const block = [
    `[submodule "${submodulePath}"]`,
    '\tignore = dirty',
    `\tpath = ${submodulePath}`,
    `\turl = ${upstream.url}`,
    `\tbranch = ${pin.tag}`,
    '\tshallow = true',
    '\tsparse-checkout = test/',
    '\tverify = none',
    '',
  ].join('\n')
  if (dryRun) {
    logger.log('[dry-run] would append to .gitmodules:')
    logger.log(block.trimEnd())
    return true
  }
  const joined =
    content.length && !content.endsWith('\n') ? `${content}\n` : content
  await fs.writeFile(GITMODULES_PATH, `${joined}${block}`, UTF8)
  return true
}

export async function stampGitmodulesPin(
  upstream: UpstreamRepo,
  pkgName: string,
  pin: TagPin,
  options?: { dryRun?: boolean | undefined },
): Promise<string> {
  const { dryRun = false } = { __proto__: null, ...options } as NonNullable<
    typeof options
  >
  const sha = pin.peeledSha ?? pin.objectSha
  const label = `${pkgName}-${pin.tag}`
  const args = [
    'scripts/fleet/gen/gitmodules-hash.mts',
    '--set',
    `upstream/${submoduleKeyFor(upstream)}`,
    sha,
    '--label',
    label,
  ]
  if (dryRun) {
    logger.log(`[dry-run] would run: node ${args.join(' ')}`)
    return sha
  }
  await spawn(process.execPath, args, { cwd: ROOT_PATH, stdio: 'inherit' })
  return sha
}

export async function materializeUpstream(
  upstream: UpstreamRepo,
  pin: TagPin,
  options?: { dryRun?: boolean | undefined },
): Promise<string> {
  const { dryRun = false } = { __proto__: null, ...options } as NonNullable<
    typeof options
  >
  const dir = path.join(ROOT_PATH, 'upstream', submoduleKeyFor(upstream))
  if (existsSync(dir) && !isDirEmptySync(dir)) {
    return dir
  }
  const cloneArgs = [
    'clone',
    '--depth=1',
    '--single-branch',
    '--filter=blob:none',
    '--sparse',
    '--branch',
    pin.tag,
    upstream.url,
    dir,
  ]
  if (dryRun) {
    logger.log(`[dry-run] would run: git ${cloneArgs.join(' ')}`)
    return dir
  }
  await spawn('git', cloneArgs, { cwd: ROOT_PATH, stdio: 'inherit' })
  await spawn('git', ['-C', dir, 'sparse-checkout', 'set', 'test/'], {
    cwd: ROOT_PATH,
    stdio: 'inherit',
  })
  return dir
}

export function detectUpstreamTestPath(
  materializedDir: string,
  explicitPath: string | undefined,
): string {
  if (explicitPath) {
    return explicitPath
  }
  const found = UPSTREAM_TEST_CANDIDATES.filter(candidate =>
    existsSync(path.join(materializedDir, candidate)),
  )
  if (found.length !== 1) {
    throw new Error(
      [
        'What: could not pick the upstream test file to port.',
        `Where: ${materializedDir}`,
        `Saw: [${found.join(', ') || 'none'}] of the known candidates (${UPSTREAM_TEST_CANDIDATES.join(', ')}); wanted exactly one.`,
        'Fix: pass --upstream-path <path> naming the upstream test file.',
      ].join('\n'),
    )
  }
  return found[0]!
}

export async function upsertLockstepRow(
  pkgName: string,
  upstream: UpstreamRepo,
  pin: TagPin,
  sha: string,
  upstreamPath: string,
  options?: { dryRun?: boolean | undefined },
): Promise<boolean> {
  const { dryRun = false } = { __proto__: null, ...options } as NonNullable<
    typeof options
  >
  const lockstep = JSON.parse(await fs.readFile(LOCKSTEP_PATH, UTF8))
  const key = submoduleKeyFor(upstream)
  const rowId = `npm-port-${pkgName}`
  if (lockstep.rows.some((row: { id: string }) => row.id === rowId)) {
    logger.log(`lockstep.json already has row ${rowId}; leaving it as is.`)
    return false
  }
  lockstep.upstreams[key] ??= {
    submodule: `upstream/${key}`,
    repo: `https://github.com/${upstream.owner}/${upstream.repo}`,
  }
  const annotated = !!pin.peeledSha && pin.peeledSha !== pin.objectSha
  lockstep.rows.push({
    kind: 'file-fork',
    id: rowId,
    upstream: key,
    criticality: 5,
    local: `test/npm/${pkgName}.test.mts`,
    upstream_path: upstreamPath,
    forked_at_sha: sha,
    deviations: [
      ...STANDARD_DEVIATIONS,
      `load the @socketregistry/${pkgName} override through setupNpmPackageTest instead of requiring the upstream entry point`,
    ],
    notes: annotated
      ? `${pin.tag} is an annotated tag; forked_at_sha records its peeled commit (${pin.objectSha.slice(0, 8)} is the tag object). The check compares the recorded SHA to the .gitmodules ref.`
      : `forked_at_sha is the commit ${pin.tag} points at.`,
  })
  if (dryRun) {
    logger.log(
      `[dry-run] would add lockstep row ${rowId} (upstream ${key}, ${upstreamPath} @ ${sha.slice(0, 8)}).`,
    )
    return true
  }
  await fs.writeFile(
    LOCKSTEP_PATH,
    `${JSON.stringify(lockstep, null, 2)}\n`,
    UTF8,
  )
  return true
}

export async function upsertTestDependency(
  pkgName: string,
  pin: TagPin,
  options?: { dryRun?: boolean | undefined },
): Promise<boolean> {
  const { dryRun = false } = { __proto__: null, ...options } as NonNullable<
    typeof options
  >
  const pkgJson = JSON.parse(await fs.readFile(TEST_NPM_PKG_JSON_PATH, UTF8))
  if (pkgJson.devDependencies[pkgName] === pin.version) {
    logger.log(`test/npm/package.json already pins ${pkgName}@${pin.version}.`)
    return false
  }
  if (dryRun) {
    logger.log(
      `[dry-run] would pin ${pkgName}@${pin.version} in test/npm/package.json.`,
    )
    return true
  }
  pkgJson.devDependencies = Object.fromEntries(
    Object.entries({
      ...pkgJson.devDependencies,
      [pkgName]: pin.version,
    }).toSorted((a, b) => naturalCompare(a[0], b[0])),
  )
  await fs.writeFile(
    TEST_NPM_PKG_JSON_PATH,
    `${JSON.stringify(pkgJson, null, 2)}\n`,
    UTF8,
  )
  return true
}

export function portHeaderFor(
  pkgName: string,
  upstream: UpstreamRepo,
  pin: TagPin,
  sha: string,
  upstreamPath: string,
): string {
  return [
    '/**',
    ` * @file Tests for ${pkgName} NPM package override. Ported 1:1 from upstream ${pin.tag}`,
    ` *   (${sha.slice(0, 8)}):`,
    ` *   https://github.com/${upstream.owner}/${upstream.repo}/blob/${sha}/${upstreamPath}.`,
    ' */',
  ].join('\n')
}

export async function wireOnePort(
  pkgName: string,
  options?: {
    dryRun?: boolean | undefined
    tag?: string | undefined
    upstream?: string | undefined
    upstreamPath?: string | undefined
  },
): Promise<void> {
  const {
    dryRun = false,
    tag,
    upstream: upstreamFlag,
    upstreamPath,
  } = {
    __proto__: null,
    ...options,
  } as NonNullable<typeof options>
  const overridePath = path.join(NPM_PACKAGES_PATH, pkgName)
  if (!existsSync(overridePath)) {
    throw new Error(
      [
        `What: no override to wire provenance for.`,
        `Where: ${overridePath}`,
        `Saw: missing directory; wanted the scaffolded override.`,
        `Fix: run \`pnpm run make-npm-override -- ${pkgName}\` first.`,
      ].join('\n'),
    )
  }
  let upstream: UpstreamRepo | undefined
  if (upstreamFlag) {
    upstream = parseRepositoryUrl(`github.com/${upstreamFlag}`)
  } else {
    // The abbreviated packument (install-v1) omits `repository`; the /latest
    // document carries the full manifest.
    let manifest:
      | { repository?: string | { url?: string | undefined } | undefined }
      | undefined
    try {
      manifest = (await httpJson(
        `https://registry.npmjs.org/${pkgName.replace('/', '%2f')}/latest`,
      )) as typeof manifest
    } catch {
      manifest = undefined
    }
    const rawUrl =
      typeof manifest?.repository === 'string'
        ? manifest.repository
        : manifest?.repository?.url
    upstream = rawUrl ? parseRepositoryUrl(rawUrl) : undefined
  }
  if (!upstream) {
    throw new Error(
      [
        `What: could not resolve the upstream GitHub repo for ${pkgName}.`,
        'Where: the npm manifest `repository` field.',
        'Saw: no parseable github.com owner/repo; wanted one.',
        'Fix: pass --upstream <owner/repo>.',
      ].join('\n'),
    )
  }
  const pin = await resolveTagPin(upstream.url, tag)
  logger.log(
    `${pkgName}: pinning ${upstream.owner}/${upstream.repo} at ${pin.tag}.`,
  )
  await appendGitmodulesBlock(upstream, pin, { dryRun })
  const sha = await stampGitmodulesPin(upstream, pkgName, pin, { dryRun })
  const materializedDir = await materializeUpstream(upstream, pin, { dryRun })
  const testPath =
    dryRun && !existsSync(materializedDir)
      ? (upstreamPath ?? UPSTREAM_TEST_CANDIDATES[0]!)
      : detectUpstreamTestPath(materializedDir, upstreamPath)
  await upsertLockstepRow(pkgName, upstream, pin, sha, testPath, { dryRun })
  await upsertTestDependency(pkgName, pin, { dryRun })
  logger.log(
    [
      '',
      `Wired. Next: port ${path.join('upstream', submoduleKeyFor(upstream), testPath)}`,
      `to test/npm/${pkgName}.test.mts with this header:`,
      '',
      portHeaderFor(pkgName, upstream, pin, sha, testPath),
      '',
      'Then gate:',
      '  node scripts/repo/check/npm-port-provenance-is-current.mts',
      '  pnpm run lockstep',
      `  FORCE_TEST=1 pnpm test test/npm/${pkgName}.test.mts`,
    ].join('\n'),
  )
}

async function main(): Promise<void> {
  const { positionals, values: cliArgs } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      tag: { type: 'string' },
      upstream: { type: 'string' },
      'upstream-path': { type: 'string' },
    },
    strict: false,
  })
  const names = positionals.filter(Boolean).map(String)
  if (!names.length) {
    throw new Error(
      [
        'What: nothing to wire.',
        'Where: wire-npm-port.mts argv.',
        'Saw: no package names; wanted one or more packages/npm/<name> names.',
        'Fix: node scripts/repo/npm/wire-npm-port.mts <name…> [--upstream <owner/repo>] [--tag <tag>] [--upstream-path <path>] [--dry-run].',
      ].join('\n'),
    )
  }
  const perPackageFlags =
    cliArgs['upstream'] || cliArgs['tag'] || cliArgs['upstream-path']
  if (names.length > 1 && perPackageFlags) {
    throw new Error(
      [
        'What: per-package flags with multiple packages.',
        'Where: wire-npm-port.mts argv.',
        'Saw: --upstream/--tag/--upstream-path alongside several names; those flags describe ONE upstream.',
        'Fix: run once per package when overriding resolution.',
      ].join('\n'),
    )
  }
  for (let i = 0, { length } = names; i < length; i += 1) {
    const name = names[i]!
    await wireOnePort(name, {
      dryRun: !!cliArgs['dry-run'],
      tag: cliArgs['tag'] as string | undefined,
      upstream: cliArgs['upstream'] as string | undefined,
      upstreamPath: cliArgs['upstream-path'] as string | undefined,
    })
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((e: unknown) => {
    logger.error(errorMessage(e))
    process.exitCode = 1
  })
}
