# socketregistry candidates: high-impact packages with deep transitive trees

Generated 2026-07-29. Method: take the top 1,000 of `npmHighImpact` and the
top 1,000 of `npmTopDependents` (npm-high-impact 1.13.0), drop the 131
packages already overridden in `packages/npm/`, then resolve every remaining
candidate's transitive `dependencies` closure from live
`registry.npmjs.org/<name>/latest` manifests (5,328 packages walked, 5,267
resolved, memoized across the pool). Pool: 1,749 candidates; 1,718 resolved; 61 were
HTTP 404 - dead spam names inside `npmTopDependents` (`anywhere-leon-web3`
and kin), a known artifact of gamed dependent counts.

Columns: impact = `npmHighImpact` rank (of 17,338); dependents =
`npmTopDependents` rank (of 4,687); closure = unique transitive runtime
deps; covered = how many of those the registry already ships an override
for.

## MEASURED 2026-07-31: the wave-1 prediction was wrong

All eight wave-1 predicates are now ported. Re-running the cut simulation
against the SAME root set as the original run shows the plumbing did NOT
collapse:

| Plumbing          | After the 131 overrides | After wave 1 | Cut |
| ----------------- | ----------------------: | -----------: | --: |
| `call-bound`      |                      14 |            8 | 43% |
| `get-intrinsic`   |                      18 |           12 | 33% |
| `get-proto`       |                      19 |           13 | 32% |
| `math-intrinsics` |                      19 |           13 | 32% |
| `dunder-proto`    |                      21 |           15 | 29% |
| `call-bind`       |                       2 |            2 |  0% |

The claim below - that porting the leaf predicates kills the plumbing
without porting it - is FALSE. Real reduction, but ~a third, not ~all.

**Why.** The plumbing packages are largely each other's gateways. After the
cut, the top surviving routes to `get-intrinsic` are `get-intrinsic` itself
(24 paths), `get-proto` (13), and `call-bound` (8). That is a
mutually-reinforcing clique, not a tree hanging off prunable leaves. Beyond
the clique the remaining consumers are a thin, non-override-shaped tail
(`nx`, `has-dynamic-import`, `@ljharb/now`, `well-known-symbols`).

**Consequence for wave 2.** `get-intrinsic`, `get-proto`, and `call-bound`
go back on the candidate list as DIRECT ports. Consumer-side simplification
cannot reach a clique; only overriding members of it can.

**Method note.** Two runs with different root sets are not comparable - an
early re-run reported `get-intrinsic` 31→25 purely because it walked every
cached package instead of the original root set. Always record the root set
with the result.

## Superseded framing: consumer simplification already cuts most of Tier 1

A cleanup override REMOVES the subtree under the package it replaces, so
the plumbing below an overridden consumer never installs. Simulating the
existing 131 overrides against the dependency graph (zero out every
overridden package's deps, re-check reachability from the top-package
roots) shows the es-family plumbing is already mostly dead in a fully
overridden tree:

| Plumbing                                         | Roots reaching it before | After |  Cut |
| ------------------------------------------------ | -----------------------: | ----: | ---: |
| `es-abstract`                                    |                       46 |     0 | 100% |
| `which-builtin-type`                             |                       46 |     0 | 100% |
| `set-function-name`                              |                       50 |     0 | 100% |
| `side-channel-weakmap`                           |                       81 |     0 | 100% |
| `side-channel-map`                               |                       82 |     1 |  99% |
| `call-bind`                                      |                       95 |     2 |  98% |
| `call-bound`                                     |                      139 |    14 |  90% |
| `get-intrinsic`                                  |                      157 |    18 |  89% |
| `dunder-proto` / `get-proto` / `math-intrinsics` |                     ~160 |   ~20 | ~88% |

The residue is a small clique that keeps itself alive: the unported
family members `is-data-view`, `data-view-buffer` / `-byte-length` /
`-byte-offset`, `own-keys`, `stop-iteration-iterator`, `is-async-function`,
`es-to-primitive` are the main remaining gateways into `call-bound` →
`get-intrinsic` → `get-proto` / `dunder-proto` / `math-intrinsics`, plus a
few niche consumers (`tape`, `mock-property`, `prop-types-exact`,
`is-equal`). Porting that handful of predicates - same shape and size as
the existing 131 - kills the plumbing without ever porting it. The Tier 1
table below is therefore a list of what the residue runs through, not a
list of packages to port directly.

By contrast, the Tier 2/3 candidates are 0% cut by the simulation
(`readable-stream`, `string_decoder`, `resolve`, `qs`, `form-data` - their
consumers are unportable-scale packages like `express`, `axios`,
`browserify`, `through2`), so they only fall to a direct port.

## Tier 1 - es-family plumbing (small API, subtree already half-ported)

The registry already ships this family's leaves (`function-bind`, `gopd`,
`hasown`, `has-symbols`, `es-define-property`, `side-channel`,
`set-function-length`, the `is-*` predicates). These sit one level up, so
each port collapses a chain whose bottom is already Socket-hardened.

| Package                                              |  Impact | Dependents | Closure |  Covered |
| ---------------------------------------------------- | ------: | ---------: | ------: | -------: |
| `get-intrinsic`                                      |     118 |      2,090 |      11 |  5 (45%) |
| `dunder-proto`                                       |     183 |          - |       4 |        2 |
| `get-proto`                                          |     190 |          - |       6 |        2 |
| `call-bound`                                         |     241 |          - |      12 |        5 |
| `side-channel-map`                                   |     291 |          - |      14 |        5 |
| `side-channel-weakmap`                               |     309 |          - |      15 |        5 |
| `call-bind`                                          |     345 |      1,979 |      15 |        7 |
| `define-data-property`                               |     372 |          - |       3 |        2 |
| `es-to-primitive`                                    |     522 |      2,479 |      21 |       10 |
| `set-function-name`                                  |     537 |          - |       6 |        4 |
| `data-view-buffer` / `-byte-length` / `-byte-offset` | 585–599 |          - | 25 each |       12 |
| `is-finalizationregistry`                            |     604 |          - |      13 |        5 |
| `is-async-function`                                  |     608 |          - |      17 |        8 |
| `which-builtin-type`                                 |     629 |          - |      48 | 30 (63%) |
| `stop-iteration-iterator`                            |     673 |          - |      19 |        7 |
| `is-data-view`                                       |     677 |          - |      24 |       12 |
| `own-keys`                                           |     685 |          - |      16 |        7 |

`get-intrinsic` is the keystone: it sits under `call-bind`, `call-bound`,
`side-channel-*`, `qs`, and most of `es-abstract`. `which-builtin-type` is
the single biggest collapse (48 transitive deps, 30 already ported).

## Tier 2 - node-builtin shims with top-100 reach

Browser-era shims still mass-installed; the cleanup port is a thin
re-export of the `node:` builtin, same shape as the existing `assert`
override.

| Package           | Impact | Dependents | Closure |  Covered | Note                                                                                                         |
| ----------------- | -----: | ---------: | ------: | -------: | ------------------------------------------------------------------------------------------------------------ |
| `readable-stream` |     27 |        659 |       9 |        1 | re-export `node:stream`; highest-impact candidate on the board                                               |
| `string_decoder`  |     53 |      1,456 |       1 |        1 | shallow tree, but top-100 and its one dep is `safe-buffer` (already ported)                                  |
| `resolve`         |     57 |        355 |       6 |  4 (67%) | all four covered deps are registry ports; zero-dep resolve is feasible on `require.resolve` + packument walk |
| `util`            |    987 |        677 |      30 | 16 (53%) | re-export `node:util`; drags the whole `is-*`/`which-typed-array` family today                               |
| `path`            |  4,129 |        204 |      32 |       16 | re-export `node:path`; low downloads rank but #204 by dependents and the deepest shim tree here              |
| `url`             |  1,666 |        656 |      20 |        6 | legacy `node:url` re-export; tree is mostly the `qs` chain                                                   |

## Tier 3 - high rank, deep tree, heavier API lift

| Package       | Impact | Dependents | Closure |  Covered | Why heavier                                                                                             |
| ------------- | -----: | ---------: | ------: | -------: | ------------------------------------------------------------------------------------------------------- |
| `qs`          |     91 |        254 |      18 |        6 | nested-query semantics are a real surface; its `side-channel` chain is already ported                   |
| `form-data`   |    100 |        377 |      19 |        7 | streams-based API differs from native `FormData`                                                        |
| `es-abstract` |    395 |      2,145 |      91 | 56 (62%) | the mother node (54 direct deps); porting means reimplementing ES spec ops - strategic, not a quick win |

## Not candidates despite rank + depth

The raw closure leaderboard is all toolchains - `react-scripts` (1,062),
`dumi` (997), `vuepress` (819), `jest` (236), `eslint` (67 direct+),
`express` (45) - surfaces far too large to ship as hardened drop-ins.
Zero-dep packages (`inherits`, `object-inspect`, `math-intrinsics`,
`es-errors`, `punycode`, `process`, `events`, `util-deprecate`,
`has-bigints`, `deep-eql`) rank high but have no tree to collapse; they
only make sense as family-completion ports alongside Tier 1.

Data: `/tmp/socketregistry-candidates.json` (full rows),
`/tmp/npm-deps-cache.json` (5,328-package dependency graph).
