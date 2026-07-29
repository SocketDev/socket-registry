# npm port provenance

Every `test/npm/<pkg>.test.mts` suite is a 1:1 port of an upstream package's own
test file. This document is how that provenance becomes machine-checkable:
what records exist, which one is authoritative, how to wire a package, and what
each gate catches.

## The four records

| Record          | Path                                                         | Owns                                                                                |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Port row        | `.config/repo/lockstep.json` → `rows[].kind === 'file-fork'` | **The truth.** Which upstream, which upstream file, which object id, what deviates. |
| Upstream pin    | `.gitmodules` → `[submodule "upstream/<owner>-<repo>"]`      | The immutable reference: release tag, `ref`, archive `sha256:`, sparse slice.       |
| Prose header    | the suite's `@file` comment                                  | The human-readable restatement, checked against the row.                            |
| Dependency spec | `test/npm/package.json` → `devDependencies`                  | The upstream bytes the suite actually runs against.                                 |

The **port row is the source of truth.** The header is hand-written prose and
drifts silently — the corpus already carries two incompatible SHA conventions
(some headers record an annotated tag's object id, others its peeled commit),
and nothing caught it until the rows were written. Treat the header as a
rendering of the row, never the other way around.

## The two gates

- **`node scripts/repo/check/npm-port-provenance-is-current.mts`** — offline,
  runs inside `pnpm run check --all` via `scripts/repo/check/` discovery. It
  asserts the four records agree: the row's upstream resolves to a shallow,
  single-branch, sparse, sha256-stamped block pinned at a release tag; the
  block's `ref` equals the row's `forked_at_sha`; the header's version, short
  SHA, permalink owner/repo, permalink SHA, and permalink path all match; the
  override package exists; and the dependency spec pins either the ported
  version or the ported object id. Add `--online` and it also reads each
  upstream's tag list with `git ls-remote --tags` and reports how many releases
  the pin trails. Any input it cannot resolve is an exit-1 failure with a
  What / Where / Saw vs wanted / Fix block — it never reads green on a pin it
  could not check.

- **`pnpm run lockstep`** — the deep tier. It runs
  `git log <forked_at_sha>..HEAD -- <upstream_path>` inside the materialized
  submodule, so it catches drift in the ported _bytes_: upstream commits that
  touched the file the suite was ported from. It needs the reference
  materialized (below) and errors loudly when it is not.

Use both: the offline gate keeps the four records in agreement on every commit;
the deep tier answers "did upstream change the test we ported?"

## Materializing a reference

`upstream/` is git-ignored fleet-wide and carries no gitlink, so nothing is
fetched on clone. Materialize on demand:

```sh
git clone --depth=1 --single-branch --filter=blob:none --sparse \
  --branch <tag> <url> upstream/<owner>-<repo>
git -C upstream/<owner>-<repo> sparse-checkout set test/
```

Cone-mode sparse-checkout always materializes the repo's root files, so
`set test/` yields the upstream's entry points plus its test directory — exactly
what a ported suite references. All three wired references together are 648 KB
on disk including their `.git` directories.

`node scripts/fleet/git-partial-submodule.mts clone upstream/<name>` does not
work for a gitlink-less reference: it runs `git submodule init <path>`, which
needs the path in the index. Use the clone above until that is fixed in the
wheelhouse.

## Wiring the next package

1. **Read the port header.** It names the upstream version, an object id, and a
   permalink to the upstream test file. If it has no `Ported 1:1 from upstream
v<version> (<sha>): <permalink>` clause, the suite is not a port — skip it.

2. **Resolve the object id to a release tag.**

   ```sh
   git ls-remote --tags https://github.com/<owner>/<repo>.git
   ```

   Find the tag whose object id (or peeled `^{}` commit) is the header SHA. If
   the SHA matches no tag, the port was taken off a branch commit; re-port it
   against a release before wiring it.

3. **Declare the reference block** and pin it. Never hand-edit `ref`:
   `uses-sha-verify-guard` requires the `ref` and its archive hash to move
   together, and only the generator can compute the hash.

   ```sh
   n=<owner>-<repo>
   git config -f .gitmodules submodule.upstream/$n.path upstream/$n
   git config -f .gitmodules submodule.upstream/$n.url https://github.com/<owner>/<repo>.git
   git config -f .gitmodules submodule.upstream/$n.branch <tag>
   git config -f .gitmodules submodule.upstream/$n.shallow true
   git config -f .gitmodules submodule.upstream/$n.sparse-checkout 'test/'
   git config -f .gitmodules submodule.upstream/$n.verify none
   node scripts/fleet/gen/gitmodules-hash.mts --set upstream/$n <sha> --label <pkg>-<tag>
   ```

4. **Add the manifest records** to `.config/repo/lockstep.json`: an `upstreams`
   entry keyed `<owner>-<repo>` naming the submodule path and repo URL, and a
   `file-fork` row with `id: npm-port-<pkg>`, `local`, `upstream_path` (the
   permalink's path), `forked_at_sha` (the header SHA), and a non-empty
   `deviations` list. Every port deviates the same three ways at minimum — the
   tape harness becomes vitest, the assertions become `expect`, and the module
   under test resolves to the `@socketregistry` override via
   `setupNpmPackageTest` — plus whatever else that suite changed.

5. **Run both gates.**

   ```sh
   node scripts/repo/check/npm-port-provenance-is-current.mts --online
   pnpm run lockstep
   ```

## Scale: when to stop adding submodules

131 references is past where a submodule per upstream pays for itself. The
tracked cost stays flat — `.gitmodules` is ~10 lines per entry and there is no
gitlink — but the operational cost does not: 131 `git clone` invocations to
materialize, 131 remote reads per currency pass, and a `.gitmodules` file
approaching 1,400 lines.

The submodule earns its keep only where the _bytes_ matter, which is the deep
tier's `git log` drift query. Past roughly 20 wired ports, switch the long tail
to the archive path the pin already encodes: the block's `sha256:` stamp is the
hash of `https://codeload.github.com/<owner>/<repo>/tar.gz/<ref>`, so a fetch-
and-verify of that one tarball gives the same bytes with no submodule, no clone
state, and no per-checkout materialization. Keep submodules for the ports whose
upstream churns (the es-shims suites that gain cases every release); use the
verified tarball for the frozen ones (`object-assign` has not moved since 2016).

The currency leg needs neither — `git ls-remote --tags` is one cheap remote read
per upstream and is already what tells you a re-port is due.
