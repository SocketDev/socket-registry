/**
 * @file The network provenance leg: how far each wired port's pin trails its
 *   upstream's newest release. Split from the offline legs so `check --all`
 *   runs without a network and only an explicit `--online` pass pays for the
 *   remote reads. An unreadable remote is a problem, never a silent pass.
 *   Doctrine: docs/agents.md/repo/npm-port-provenance.md.
 */

import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

import { measureReleaseCurrency, parseLsRemoteTags } from './records.mts'

import type { NpmPortPin, NpmPortProblem } from './records.mts'
import type { FileForkRow, Upstream } from '../../../fleet/lockstep/schema.mts'

export interface NpmPortCurrencyOptions {
  // Tag reader override. Defaults to `git ls-remote --tags`; injected by tests
  // so the behind-latest and unreadable-remote paths run without a network.
  listTags?: ((repoUrl: string) => Promise<string[]>) | undefined
}

/**
 * The release tags an upstream remote advertises.
 */
export async function listRemoteReleaseTags(
  repoUrl: string,
): Promise<string[]> {
  const result = (await spawn('git', ['ls-remote', '--tags', repoUrl], {
    stdio: 'pipe',
    stdioString: true,
  })) as { stdout?: string | undefined }
  return parseLsRemoteTags(String(result?.stdout ?? ''))
}

/**
 * How far each wired port's pin trails its upstream's newest release. A remote
 * that cannot be read, an upstream with no release tags, and a pin that is not
 * one of the upstream's releases are all problems — currency is never assumed.
 */
export async function findNpmPortCurrencyProblems(
  rows: readonly FileForkRow[],
  upstreams: Readonly<Record<string, Upstream>>,
  pins: readonly NpmPortPin[],
  options?: NpmPortCurrencyOptions | undefined,
): Promise<NpmPortProblem[]> {
  const opts = { __proto__: null, ...options } as NpmPortCurrencyOptions
  const listTags = opts.listTags ?? listRemoteReleaseTags
  const byName = new Map(pins.map(pin => [pin.name, pin]))
  const problems: NpmPortProblem[] = []
  for (const row of rows) {
    const upstream = upstreams[row.upstream]
    const entry = upstream ? byName.get(upstream.submodule) : undefined
    if (!upstream || !entry?.branch) {
      continue
    }
    let tags: string[]
    try {
      // One network read per upstream, sequential so a rate-limited remote
      // fails on the first repo instead of three at once.
      // oxlint-disable-next-line no-await-in-loop -- sequential reads
      tags = await listTags(upstream.repo)
    } catch (e) {
      problems.push({
        id: row.id,
        what: 'the upstream release list could not be read, so currency is unknown.',
        where: upstream.repo,
        saw: `git ls-remote failed: ${String(e)}`,
        wanted: 'the upstream tag list, to compare against the pinned release',
        fix: 'restore network access and re-run, or drop --online to run the offline provenance legs only.',
      })
      continue
    }
    const currency = measureReleaseCurrency(entry.branch, tags)
    if (currency.newest === undefined) {
      problems.push({
        id: row.id,
        what: 'the upstream publishes no release tags, so the pin cannot be release-anchored.',
        where: upstream.repo,
        saw: `${tags.length} ref(s), none a release tag`,
        wanted: 'at least one release tag to pin against',
        fix: 'annotate the block with `# no-release-tag: <reason>` and track the default branch instead.',
      })
      continue
    }
    if (currency.behind === -1) {
      problems.push({
        id: row.id,
        what: "the pinned tag is not among the upstream's release tags.",
        where: `.gitmodules:${entry.line} [submodule "${entry.name}"]`,
        saw: `branch = ${entry.branch}`,
        wanted: `one of the upstream's release tags — newest is ${currency.newest}`,
        fix: `re-pin at ${currency.newest} and re-port the suite, then advance the row's forked_at_sha.`,
      })
      continue
    }
    if (currency.behind > 0) {
      problems.push({
        id: row.id,
        what: "the pinned release trails the upstream's newest release.",
        where: `.gitmodules:${entry.line} [submodule "${entry.name}"]`,
        saw: `pinned ${entry.branch}, ${currency.behind} release(s) behind ${currency.newest}`,
        wanted: `the pin at ${currency.newest}, with the suite re-ported against it`,
        fix: `re-port ${row.local} against ${currency.newest}, then \`node scripts/fleet/gen/gitmodules-hash.mts --set ${upstream.submodule} <ref> --label <pkg>-${currency.newest}\` and advance forked_at_sha.`,
      })
    }
  }
  return problems
}
