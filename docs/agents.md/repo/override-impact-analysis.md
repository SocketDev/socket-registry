# Override impact analysis

How to decide which npm packages deserve a `@socketregistry/*` override, and
the two measurement traps that produced a wrong answer here once already.

## The two signals

- **Rank** - position in `npm-high-impact`'s lists (`npmHighImpact`,
  `npmTopDependents`, `npmTopDownloads`). Catalog-pinned devDependency; it is
  the ecosystem-reach input.
- **Cut** - what an override actually REMOVES from an install tree. A cleanup
  override deletes the subtree under the package it replaces, so the value of
  a port is the dependency closure it collapses, not the package's own size.

Rank alone over-values packages nothing depends on transitively. Cut alone
over-values deep trees nobody installs. Rank the candidates, then simulate the
cut.

## Trap 1: a clique does not prune like a tree

Modelling the cut as "remove the leaves and the branch dies" is wrong when the
targets depend on each other.

Measured on the es-abstract plumbing (2026-07-31): porting eight leaf
predicates (`is-data-view`, the `data-view-*` trio, `own-keys`,
`stop-iteration-iterator`, `is-async-function`, `es-to-primitive`) was
predicted to drive the plumbing to ~0 reachable roots. It cut 29–43%:
`call-bound` 14→8, `get-intrinsic` 18→12, `get-proto` 19→13, `dunder-proto`
21→15, `math-intrinsics` 19→13, `call-bind` 2→2.

The surviving-gateway breakdown explains it: the top remaining routes to
`get-intrinsic` were `get-intrinsic` itself (24 paths), `get-proto` (13), and
`call-bound` (8). These packages are each other's gateways - a
mutually-reinforcing clique. Consumer-side overriding cannot reach a clique;
only overriding its members can.

**Rule:** always report SURVIVING GATEWAYS alongside the cut percentage. A
percentage on its own invites the wrong conclusion. When a target appears in
its own surviving-gateway set, treat the group as a clique and plan direct
ports of its members.

## Trap 2: root sets must match to compare

The cut number is meaningless without the root set it was measured from. An
early re-run of the same simulation reported `get-intrinsic` 31→25 rather than
18→12 purely because it walked every cached package instead of the original
candidate-plus-overridden root set.

**Rule:** record the root set with every result and refuse to compare runs
that used different ones.

## Research record

The measured research behind the current override selection lives beside this
doc:

- [`npm-high-impact-rankings.md`](npm-high-impact-rankings.md) - every
  existing override ranked by npm-high-impact position and dependent count
  (117 of 131 chart; `safe-buffer` at rank 37 leads).
- [`npm-override-candidates.md`](npm-override-candidates.md) - the candidate
  research that chose the wave-1 ports: top-1,000 impact and dependent pools,
  transitive-closure resolution of 5,328 packages, the tiered candidate
  tables, and the measured wave-1 correction that exposed the clique trap
  above.

## Related

- `scripts/repo/npm/survey-override-deps.mts` - the offline-first survey of existing
  overrides and their remaining dependencies.
- The fleet skill for cross-repo impact research (wheelhouse) wraps the
  reachability simulation described here.
