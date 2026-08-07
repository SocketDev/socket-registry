# Thin-repo conversion and the fleet-pack

How a fleet member stops tracking `scripts/fleet/` and fetches it instead, what
that depends on, and the traps that cost a day on 2026-08-06.

## The law

`scripts/` holds exactly two directories, and ownership decides which:

- `scripts/fleet/` is cascade-owned machinery authored in the wheelhouse
  template. A MEMBER never tracks it. It arrives from the fleet-pack at
  bootstrap.
- `scripts/repo/` is the repo's own scripts, tracked normally.

A repo-owned script found anywhere else moves to `scripts/repo/`. A fleet
script found in a member is deleted, because the pack serves it. The wheelhouse
is exempt from the untracked half: it AUTHORS the payload.

Enforced by `scripts/fleet/check/scripts-are-segmented.mts`, which reads git's
index rather than the filesystem. A bootstrapped checkout has the payload on
disk either way, so only the index distinguishes thin from fat.

## Delivery: how the payload reaches a runner

`.github/workflows/fleet-pack-release.yml` cuts a content-addressed bundle on
every push to wheelhouse main and pushes it to
`ghcr.io/socketdev/socket-wheelhouse/fleet-pack:<tag>`, alongside a GitHub
release carrying the same tarball.

A member hydrates through `scripts/repo/bootstrap/fleet.mjs`, which tries, in
order:

1. **Anonymous GHCR pull.** Works because the package is PUBLIC (flipped
   2026-08-06). No token, no secret, works for forks.
2. **`gh release download`** from the private wheelhouse, which needs a token
   minted from a GitHub App and gated on `vars.SOCKET_PAYLOAD_CLIENT_ID`. That
   variable is not set anywhere, so this path is effectively dead. The GHCR
   path is what carries the fleet.

The composite `.github/actions/fleet/checkout` runs detect, mint, hydrate
immediately after checkout, so every job has the payload before its first
reader.

### Verifying delivery works, without guessing

```bash
# 1. Anonymous pull must issue a token (200, not 403).
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://ghcr.io/token?service=ghcr.io&scope=repository:socketdev/socket-wheelhouse/fleet-pack:pull"

# 2. The tag the member pins must be IN the tag list.
TOKEN=$(curl -s "https://ghcr.io/token?service=ghcr.io&scope=repository:socketdev/socket-wheelhouse/fleet-pack:pull" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s -H "Authorization: Bearer $TOKEN" \
  https://ghcr.io/v2/socketdev/socket-wheelhouse/fleet-pack/tags/list
```

## The traps

<details>
<summary><b>Six conversion traps</b> - stale bundle ref, web-UI-only visibility, blind untracking, CI ordering, hydration sweeps, worktree pre-push lint</summary>

**A pinned ref that predates OCI publishing.** socket-facts pinned
`fleet-pack-be357fd7...` in `.config/repo/socket-wheelhouse.json`. GHCR had only
`fleet-pack-aea37f35...`, and the release fallback needs a token nobody has, so
hydration failed with BOTH paths missing. That failure looks like a permissions
problem and is not. Before converting a repo, check its `bundle.ref` against the
live tag list above and repin if absent.

**Package visibility is web-UI only.** GitHub exposes no REST setter, so a
missing package or a 403 cannot be fixed by any script. An org owner flips it at
`https://github.com/orgs/SocketDev/packages`, package, Package settings, Danger
Zone. Also: a package that was never published does not appear in that list at
all, which reads identically to "I lack permission to see it".

**Untracking blind deletes real content.** Diff the member's `scripts/fleet/`
against `template/base/scripts/fleet/` FIRST. Anything present only in the
member is repo-owned and must `git mv` to `scripts/repo/` before the untrack.

**CI ordering.** The payload must exist before the FIRST reader in every job,
not before the job that obviously needs fleet scripts. socket-webext's own
conversion broke its CI repo-wide on exactly this, and it stayed broken for
weeks because a missing payload surfaces as unrelated missing-script errors
rather than a named fetch failure.

**Hydration mutates tracked files.** Bootstrapping brings the repo to the
bundle's cascade state, which touches tracked workflow files (they cannot be
gitignored, since GitHub needs them in-repo). A `git add -A` after hydrating
sweeps that whole cascade into your commit. Stage explicit paths, or describe
the cascade in the commit message.

**The pre-push gate lints the working tree it runs in.** Pushing from a `/tmp`
worktree with an incomplete `node_modules` fails for a missing toolchain, not a
real violation; pushing from the primary checkout lints the PRIMARY's files and
ignores your worktree's fixes. Symlink the primary's `node_modules` into the
worktree and push from there.

</details>

## Procedure

1. Verify delivery (both commands above) and that `bundle.ref` names a live tag.
2. Worktree off `origin/main`; never touch the shared `~/projects/<repo>`.
3. Pre-flight ownership diff; `git mv` repo-owned files to `scripts/repo/`.
4. `git rm -r --cached scripts/fleet` plus gitignore coverage. Files stay on
   disk.
5. Confirm the hydrate step runs ahead of every job's first reader.
6. Prove it: fresh clone, bootstrap, payload materializes, a fleet entry script
   runs. Then the repo's own lint, typecheck, and tests.
7. Land on main directly. Fleet members do NOT use PRs. Agents commit and hand
   SHAs to the coordinator, who pushes; an agent pushing a protected main is
   refused as permission laundering.
8. Watch CI on the pushed commit. Hydration success reads as
   `install-fleet: fetched <tag> from ghcr` in the setup step.

## State as of 2026-08-06

- GHCR package: **public**, anonymous pull verified.
- Thin: socket-webext (older bundle, CI red on the missing payload; a repin plus
  this procedure should repair it), socket-facts (landed at `0f064fae7`,
  hydration proven in CI, remaining job failures undiagnosed).
- Fat, still to convert: socket-cli, socket-sdk-js, socket-registry, sdxgen,
  bun-security-scanner.
