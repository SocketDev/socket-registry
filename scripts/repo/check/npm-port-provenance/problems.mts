/**
 * @file The offline provenance legs: every disagreement between a ported npm
 *   suite's lockstep row, its `.gitmodules` pin, its prose header, and its
 *   dependency spec. Pure — every input is injected, so the whole comparison
 *   unit-tests without a filesystem or a network.
 *   Doctrine: docs/agents.md/repo/npm-port-provenance.md.
 */

import {
  normalizeVersionTag,
  npmPortPackageName,
  parseNpmPortHeader,
  releaseTagVersion,
  upstreamRepoSlug,
} from './records.mts'

import type {
  NpmPortCheckInput,
  NpmPortPin,
  NpmPortProblem,
} from './records.mts'
import type { FileForkRow, Upstream } from '../../../fleet/lockstep/schema.mts'

// A 40-hex object id embedded in a codeload/archive tarball dependency spec.
// oxlint-disable-next-line socket/require-regex-comment -- documented above
const ARCHIVE_SPEC_SHA_RE = /\/([0-9a-f]{40})\.tar\.gz$/

/**
 * Every offline disagreement between a ported suite's header, its lockstep row,
 * its `.gitmodules` pin, and its dependency spec. Pure — every input is
 * injected, so the whole gate unit-tests without a filesystem.
 */
export function findNpmPortProvenanceProblems(
  input: NpmPortCheckInput,
): NpmPortProblem[] {
  const problems: NpmPortProblem[] = []
  const byName = new Map(input.pins.map(pin => [pin.name, pin]))
  for (const row of input.rows) {
    const upstream = input.upstreams[row.upstream]
    if (!upstream) {
      problems.push({
        id: row.id,
        what: 'the row names an upstream that the manifest does not declare.',
        where: `.config/repo/lockstep.json rows[id=${row.id}]`,
        saw: `upstream "${row.upstream}"`,
        wanted: "a key present in the manifest's top-level `upstreams` map",
        fix: `add an \`upstreams["${row.upstream}"]\` entry naming its submodule path and repo URL.`,
      })
      continue
    }
    const entry = byName.get(upstream.submodule)
    if (!entry) {
      problems.push({
        id: row.id,
        what: 'the declared upstream has no reference block in .gitmodules.',
        where: `.gitmodules, expected [submodule "${upstream.submodule}"]`,
        saw: 'no block',
        wanted: `a shallow single-branch block for ${upstream.submodule}`,
        fix: `declare the block with \`git config -f .gitmodules submodule.${upstream.submodule}.<field>\`, then pin it with \`node scripts/fleet/gen/gitmodules-hash.mts --set ${upstream.submodule} ${row.forked_at_sha} --label <pkg>-<tag>\`.`,
      })
      continue
    }
    checkPinShape(problems, row, upstream, entry)
    checkHeaderAgreement(problems, row, upstream, entry, input.readPortSource)
    checkDependencySpec(problems, row, entry, input)
  }
  return problems
}

function checkPinShape(
  problems: NpmPortProblem[],
  row: FileForkRow,
  upstream: Upstream,
  entry: NpmPortPin,
): void {
  const missing: string[] = []
  if (!entry.shallow) {
    missing.push('shallow = true')
  }
  if (!entry.branch) {
    missing.push('branch = <release-tag>')
  }
  if (!entry.sparse) {
    missing.push('sparse-checkout = <patterns>')
  }
  if (!entry.headerSha) {
    missing.push('a `# <label> sha256:<64hex>` header stamp')
  }
  if (missing.length) {
    problems.push({
      id: row.id,
      what: 'the upstream reference block is not a pinned sparse shallow reference.',
      where: `.gitmodules:${entry.line} [submodule "${entry.name}"]`,
      saw: `missing ${missing.join(', ')}`,
      wanted:
        'shallow = true, a release-tag branch, a sparse-checkout slice, and a sha256 stamp',
      fix: `add the missing field(s), then re-stamp with \`node scripts/fleet/gen/gitmodules-hash.mts --set ${upstream.submodule} ${row.forked_at_sha} --label <pkg>-<tag>\`.`,
    })
  }
  if (entry.branch && releaseTagVersion(entry.branch) === undefined) {
    problems.push({
      id: row.id,
      what: 'the upstream reference tracks a moving ref rather than a release tag.',
      where: `.gitmodules:${entry.line} [submodule "${entry.name}"]`,
      saw: `branch = ${entry.branch}`,
      wanted:
        'a release tag such as v1.2.3 — immutable, so the pin cannot drift',
      fix: `re-point the block at the release tag the port was taken from, then re-stamp with \`node scripts/fleet/gen/gitmodules-hash.mts --set ${upstream.submodule} <ref> --label <pkg>-<tag>\`.`,
    })
  }
  const ref = entry.ref
  if (ref !== row.forked_at_sha) {
    problems.push({
      id: row.id,
      what: 'the pinned ref disagrees with the SHA the port was forked at.',
      where: `.gitmodules:${entry.line} [submodule "${entry.name}"] vs .config/repo/lockstep.json rows[id=${row.id}]`,
      saw: `ref ${ref ?? '(unset)'}, forked_at_sha ${row.forked_at_sha}`,
      wanted: 'the two are the same object id — the pin IS the port point',
      fix: `re-pin with \`node scripts/fleet/gen/gitmodules-hash.mts --set ${upstream.submodule} ${row.forked_at_sha} --label <pkg>-<tag>\`, or re-port the suite and update forked_at_sha.`,
    })
  }
}

function checkHeaderAgreement(
  problems: NpmPortProblem[],
  row: FileForkRow,
  upstream: Upstream,
  entry: NpmPortPin,
  readPortSource: (localPath: string) => string | undefined,
): void {
  const source = readPortSource(row.local)
  if (source === undefined) {
    problems.push({
      id: row.id,
      what: 'the ported suite the row points at does not exist.',
      where: row.local,
      saw: 'no file',
      wanted: "the ported conformance suite named by the row's `local` field",
      fix: `correct \`local\` in .config/repo/lockstep.json rows[id=${row.id}], or restore the suite.`,
    })
    return
  }
  const header = parseNpmPortHeader(source)
  if (!header) {
    problems.push({
      id: row.id,
      what: 'the ported suite carries no machine-readable provenance header.',
      where: `${row.local}:1`,
      saw: 'no `Ported 1:1 from upstream v<version> (<sha>): <permalink>` clause',
      wanted:
        'an `@file` header naming the upstream version, the object id, and the permalink to the ported file',
      fix: `write the header as \`Ported 1:1 from upstream ${entry.branch ?? '<tag>'} (${row.forked_at_sha}): ${upstream.repo}/blob/${row.forked_at_sha}/${row.upstream_path}.\``,
    })
    return
  }
  if (header.permalinkSha !== row.forked_at_sha) {
    problems.push({
      id: row.id,
      what: 'the header permalink points at a different object than the port record.',
      where: `${row.local}:1 vs .config/repo/lockstep.json rows[id=${row.id}]`,
      saw: `header ${header.permalinkSha}, forked_at_sha ${row.forked_at_sha}`,
      wanted: 'both name the object id the suite was ported from',
      fix: "rewrite the header permalink to the row's forked_at_sha, or re-port and advance the row.",
    })
  }
  if (!row.forked_at_sha.startsWith(header.inlineSha)) {
    problems.push({
      id: row.id,
      what: "the header's inline short SHA is not a prefix of the ported object id.",
      where: `${row.local}:1`,
      saw: `(${header.inlineSha})`,
      wanted: `a prefix of ${row.forked_at_sha}`,
      fix: `rewrite the parenthesised SHA to ${row.forked_at_sha.slice(0, 8)} or the full object id.`,
    })
  }
  const slug = upstreamRepoSlug(upstream.repo)
  const headerSlug = `${header.owner}/${header.repo}`
  if (slug !== headerSlug) {
    problems.push({
      id: row.id,
      what: 'the header permalink names a different upstream repository than the manifest.',
      where: `${row.local}:1 vs .config/repo/lockstep.json upstreams["${row.upstream}"]`,
      saw: `header ${headerSlug}, manifest ${slug ?? upstream.repo}`,
      wanted: 'both name the same upstream repository',
      fix: 'correct whichever record names the wrong repository.',
    })
  }
  if (header.upstreamPath !== row.upstream_path) {
    problems.push({
      id: row.id,
      what: 'the header permalink names a different upstream file than the port record.',
      where: `${row.local}:1 vs .config/repo/lockstep.json rows[id=${row.id}]`,
      saw: `header ${header.upstreamPath}, upstream_path ${row.upstream_path}`,
      wanted: 'both name the upstream test file the suite was ported from',
      fix: "correct whichever record names the wrong path — the row drives lockstep's drift query, so it must be the real upstream path.",
    })
  }
  if (entry.branch && normalizeVersionTag(entry.branch) !== header.version) {
    problems.push({
      id: row.id,
      what: 'the header names a different upstream version than the pinned release tag.',
      where: `${row.local}:1 vs .gitmodules:${entry.line}`,
      saw: `header v${header.version}, pin ${entry.branch}`,
      wanted: 'the header version is the pinned release tag',
      fix: `rewrite the header to name ${entry.branch}, or re-pin the block at v${header.version}.`,
    })
  }
}

function checkDependencySpec(
  problems: NpmPortProblem[],
  row: FileForkRow,
  entry: NpmPortPin,
  input: NpmPortCheckInput,
): void {
  const packageName = npmPortPackageName(row.local)
  if (!input.hasOverridePackage(packageName)) {
    problems.push({
      id: row.id,
      what: 'the ported suite has no override package to exercise.',
      where: `packages/npm/${packageName}`,
      saw: 'no directory',
      wanted: `packages/npm/${packageName} — the @socketregistry drop-in the suite tests`,
      fix: `rename the suite to match its override, or drop the row from .config/repo/lockstep.json.`,
    })
    return
  }
  const spec = input.devDependencies[packageName]
  if (spec === undefined) {
    problems.push({
      id: row.id,
      what: 'the ported package is not pinned in the conformance fixture manifest.',
      where: `test/npm/package.json devDependencies["${packageName}"]`,
      saw: 'no entry',
      wanted:
        'a spec pinning the upstream release the suite was ported from, so the suite runs against those bytes',
      fix: `add \`"${packageName}": "${normalizeVersionTag(entry.branch ?? '')}"\` to test/npm/package.json devDependencies.`,
    })
    return
  }
  const archiveSha = ARCHIVE_SPEC_SHA_RE.exec(spec)
  if (archiveSha) {
    if (archiveSha[1] !== row.forked_at_sha) {
      problems.push({
        id: row.id,
        what: 'the archive dependency spec pins a different object than the port record.',
        where: `test/npm/package.json devDependencies["${packageName}"]`,
        saw: `archive ${archiveSha[1]}, forked_at_sha ${row.forked_at_sha}`,
        wanted: 'the suite runs against the same bytes it was ported from',
        fix: `re-point the archive spec at ${row.forked_at_sha}, or re-port the suite from the archive's object.`,
      })
    }
    return
  }
  const pinnedVersion = normalizeVersionTag(entry.branch ?? '')
  if (spec !== pinnedVersion) {
    problems.push({
      id: row.id,
      what: 'the dependency spec disagrees with the pinned upstream release.',
      where: `test/npm/package.json devDependencies["${packageName}"] vs .gitmodules:${entry.line}`,
      saw: `spec ${spec}, pin ${entry.branch ?? '(unset)'}`,
      wanted: 'the suite runs against the release it was ported from',
      fix: `set the spec to "${pinnedVersion}", or re-pin the reference block at the release the spec names.`,
    })
  }
}
