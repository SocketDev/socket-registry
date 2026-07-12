/**
 * @file Check --all step registry — gh-aw workflow contracts, CLAUDE.md/
 *   .claude segmentation, and the release/publish/doc-freshness surface. One
 *   of three domain-split siblings of check-steps.mts (the others: hooks-
 *   and-docs, paths-and-supply-chain); see that file for the assembled order.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

import { REPO_ROOT } from '../paths.mts'
import { run } from './check-steps.mts'

export function buildReleaseAndDocsSteps(): Array<() => boolean> {
  return [
    // gh-aw agentic workflows: each `<name>.md` source has a compiled
    // `<name>.lock.yml` (what Actions runs) whose embedded body_hash matches
    // the .md body — catches a prompt edited without `gh aw compile`. Pure
    // node, no gh-aw dependency; vacuous pass with no agentic workflows.
    () => run('node', ['scripts/fleet/check/gh-aw-locks-are-current.mts']),
    // gh-aw agentic workflows: any explicit `engine.model` frontmatter pin is a
    // canonical model id (KNOWN_MODELS: pricing registry + AI_TIER). Catches a
    // workflow left on a stale id (claude-sonnet-4-5) after the tier moved — the
    // "same role, two model strings" drift the ai-spawns gate can't see.
    () =>
      run('node', [
        'scripts/fleet/check/gh-aw-workflow-models-are-canonical.mts',
      ]),
    // The fleet-owned local-agent egress allowlist (.config/fleet/egress-
    // allowlist.json) is a SUBSET of gh-aw's expanded firewall allowDomains — the
    // hosts CI's agent firewall already trusts. One-directional containment (fleet
    // ⊆ gh-aw), not byte-equality, so a gh-aw version bump doesn't flap it; fails
    // only when the local allowlist grants a host the CI fence would block (a
    // hole). Vacuous pass where the allowlist or a gh-aw lock is absent.
    () =>
      run('node', ['scripts/fleet/check/egress-allowlist-is-gh-aw-subset.mts']),
    // The non-gh-aw weekly-update fallback ships disabled-only
    // (`weekly-update-non-gh-aw.yml.disabled`); the ENABLED `.yml` is transient +
    // untracked. If it were committed it auto-runs weekly in every cascaded repo —
    // this gate fails when the enabled form is git-tracked, so the accident can't
    // land.
    () =>
      run('node', [
        'scripts/fleet/check/weekly-update-fallback-is-disabled.mts',
      ]),
    // CLAUDE.md informativeness audit. Every `###` section in the fleet
    // block must anchor to one of: a hook citation
    // (`.claude/hooks/...` reference), a docs link
    // (`[text](docs/...)`), a skill reference
    // (`.claude/skills/.../SKILL.md`), or an explicit
    // `(advisory, no enforcement)` opt-out. CLAUDE.md is load-bearing
    // context for every session; sections without an enforcement
    // anchor tend to rot. Per the Salesforce agentic-engineering
    // article, CLAUDE.md variance is a direct quality driver.
    () =>
      run('node', ['scripts/fleet/check/claude-md-rules-are-informative.mts']),
    // .claude/ segmentation gate. Every entry under
    // .claude/{agents,commands,hooks,skills}/ must live under fleet/<name>/
    // (when wheelhouse-canonical) or repo/<name>/ (everything else).
    // Dangling top-level entries shadow the canonical copy and break
    // skill resolution. Past incident (2026-06-01): fleet-wide audit found
    // ~200 dangling entries across 10 repos. Auto-fixable with
    // `node scripts/fleet/check/claude-dirs-are-segmented.mts --fix`.
    () => run('node', ['scripts/fleet/check/claude-dirs-are-segmented.mts']),
    // Release-hygiene floor: every publishable package.json (private!==true,
    // has a name) must declare a `files` field. Without it, npm publishes the
    // ENTIRE directory — test fixtures, .claude/ tooling, coverage, secrets.
    // REPORT-ONLY (exits 0, lists findings); flip MODE to 'strict' in the
    // check after clearing the pre-existing backlog.
    () =>
      run('node', [
        'scripts/fleet/check/published-packages-have-files-field.mts',
      ]),
    // package.json `files:` allowlist hygiene. Flags publishes that leak
    // dev/test content (overshoot), `files:` entries that match nothing in
    // the publish surface (undershoot), and packages missing the canonical
    // README + LICENSE essentials. Skips workspaces marked
    // `"private": true`. Uses `npm pack --dry-run --json` as the source of
    // truth — same logic npm itself uses for publish.
    () =>
      run('node', ['scripts/fleet/check/package-files-are-allowlisted.mts']),
    // Pre-publish source gate: every publishable package.json declares
    // publishConfig.access:"public" + provenance:true (and registry-if-set =
    // npmjs) — the source-config preconditions for a public, provenance-attested
    // release under OIDC trusted publishing. Skips `"private": true` workspaces.
    // The post-publish registry audit is provenance-is-attested.mts.
    () => run('node', ['scripts/fleet/check/publish-config-is-hardened.mts']),
    // The release gate for the FILES FIELD: packs the package (`pnpm pack`)
    // and inspects the real tarball entry list, failing on fleet/claude
    // scaffolding, hidden files, or anything outside the `files` contract —
    // a wrong `files` field publishes silently otherwise. Skips `"private":
    // true` workspaces (never publish).
    () => run('node', ['scripts/fleet/check/pack-contents-are-clean.mts']),
    // Release-gate: the fleet bundle must build → install → verify round-trip
    // cleanly before it ships. Calls validate-release-bundle.mts (wheelhouse-only
    // `scripts/repo/`); vacuous pass in every cascaded fleet repo (validator
    // absent). Catches a broken producer or installer before the tarball reaches
    // a GitHub Release.
    () => run('node', ['scripts/fleet/check/bundle-is-installable.mts']),
    // The dep-0 fetcher (bootstrap/fleet.mjs) is a rolldown-inlined build artifact;
    // fail loud if it drifts from its bootstrap/src/* source (rebuild: node
    // scripts/repo/build-bootstrap-fetcher.mts). Wheelhouse-only — the build script
    // lives in uncascaded scripts/repo/, so a member with no such script vacuous-passes.
    () =>
      !existsSync(
        path.join(REPO_ROOT, 'scripts', 'repo', 'build-bootstrap-fetcher.mts'),
      ) || run('node', ['scripts/repo/build-bootstrap-fetcher.mts', '--check']),
    // Every slashed pattern in .config/fleet/.prettierignore must be `**/`-anchored
    // or it silently matches nothing (oxfmt roots the matcher at the ignore file's
    // dir via Gitignore::new). Catches the footgun where a bare `vendor/**` looks
    // right but excludes nothing.
    () =>
      run('node', [
        'scripts/fleet/check/prettierignore-globs-are-anchored.mts',
      ]),
    // A PENDING release's CHANGELOG entry must be DERIVED from the commits it
    // releases (run `node scripts/fleet/bump.mts`), never hand-written ahead of the
    // tag. Fires only when package.json is ahead of the last v<semver> tag;
    // regenerates the entry from the commits since that tag and fails on drift.
    // Catches the failure mode that shipped a CHANGELOG entry describing work that
    // landed after its tag. Published versions are historical and not re-checked.
    () => run('node', ['scripts/fleet/check/changelog-is-commit-derived.mts']),
    // No tracked symlink is self-referential or points at an absolute path
    // inside the repo (a `node_modules → /abs/<repo>/node_modules` self-loop
    // bricked fresh clones fleet-wide with ELOOP; git kept it tracked despite
    // .gitignore). Reads the git object's link target so it catches one already
    // committed regardless of how it was staged.
    () => run('node', ['scripts/fleet/check/tracked-symlinks-are-safe.mts']),
    // README coverage badge matches the latest coverage run. When
    // coverage/coverage-summary.json (vitest json-summary) exists AND the README
    // carries a populated `![Coverage](…coverage-NN%…)` badge, the percent must
    // equal the rounded line-coverage total. Fails open when not checkable (no
    // badge, the `<PCT>` placeholder, or no coverage data — a lint/type CI lane).
    // Pre-bump-wave twin of `make-coverage-badge.mts`; shares lib/coverage-badge.
    () => run('node', ['scripts/fleet/check/coverage-badge-is-current.mts']),
    // Reminder/guard duplication gate. The fleet convention: a `-guard` hook
    // BLOCKS, a `-nudge` hook NUDGES — one surface per concern, never both.
    // Errors when a base name has both `<base>-guard` and `<base>-nudge`
    // (an exact same-concern duplicate); advisory-lists 2-segment shared-prefix
    // pairs for a human glance. Past incident (2026-06-03): a prose-antipattern
    // reminder + guard overlapped; resolved by dropping the reminder.
    () =>
      run('node', [
        'scripts/fleet/check/hooks-have-no-guard-nudge-overlap.mts',
        '--quiet',
      ]),
    // Hook name ⟷ blocking behavior: a `-guard` must BLOCK (exitCode=2 /
    // exit(2) / return 2 / decision:'block'), a `-nudge` must only NUDGE.
    // Errors when a `-guard` never blocks (→ should be `-nudge`) or a
    // `-nudge` blocks (→ should be `-guard`).
    () =>
      run('node', [
        'scripts/fleet/check/hook-names-are-accurate.mts',
        '--quiet',
      ]),
    // The cascaded co-located trees (.claude/hooks/fleet, .config/fleet/oxlint-plugin,
    // .git-hooks) ship to members + the release bundle, but the cascaded vitest
    // config EXCLUDES their test dirs — so a wheelhouse-only hook/lint-rule/git-hook
    // test there is dead weight no member can run. Those tests live under test/repo/
    // (vitest); this fails if a `*.test.*` reappears in a cascaded tree. See
    // docs/agents.md/fleet/test-layout.md.
    () =>
      run('node', [
        'scripts/fleet/check/cascaded-fleet-trees-have-no-tests.mts',
        '--quiet',
      ]),
    // Lock-step release-cascade pairing: a member's pinned bundle.cascadeSha has a
    // matching gh release whose templateSha equals it, and the release at
    // bundle.ref exists. Read-side twin of the dep-0 fetch-path verify (which
    // hard-fails at install). Network-gated: SKIPS when gh is unavailable, so it
    // no-ops in offline CI lanes + repos with no pin (the wheelhouse producer).
    () =>
      run('node', [
        'scripts/fleet/check/release-and-cascade-are-paired.mts',
        '--quiet',
      ]),
    // llms.txt structural freshness: compares H1 + section titles + ordered link
    // pairs of the committed file against deterministic extraction. Prose is never
    // diffed — the check is credential-free and member-safe fail-open (no file or
    // no package.json → skip).
    () =>
      run('node', ['scripts/fleet/check/llms-txt-is-current.mts', '--quiet']),
    // Test mirror-naming convention: every unit test basename matches the basename
    // of its one first-party static import. Run with --strict so violations exit
    // non-zero; mirror-exempt markers on skip files suppress known exceptions.
    () =>
      run('node', [
        'scripts/fleet/check/tests-are-mirror-named.mts',
        '--strict',
        '--quiet',
      ]),
    // package.json test*-script convention (CLAUDE.md "test-scripts-defer-to-mts"):
    // route through a .mts wrapper, never a raw vitest/jest/mocha/ava/tap
    // binary (the hook/lint-rule tier's `node --test` is exempt). REPORT-ONLY
    // (exits 0) — the fleet backlog of raw invocations predates this gate; flip
    // to --strict once it clears.
    () => run('node', ['scripts/fleet/check/test-scripts-are-deferred.mts']),
    // external-tools.json shared entries match the wheelhouse copy: the
    // cascade-owned setup actions read this per-repo-owned data file at runtime,
    // so stale copies break CI setup (five repos on 2026-07-08). Compares only
    // SHARED tool names; repo-specific tools pass. Skips cleanly in CI (needs a
    // sibling wheelhouse checkout for the reference copy).
    () =>
      run('node', [
        'scripts/fleet/check/external-tools-match-wheelhouse.mts',
        '--quiet',
      ]),
  ]
}
