# stale-node-modules-reminder

**Type:** PostToolUse reminder (Bash) — nudges, never blocks.

**Trigger:** a Bash command's output contains a Node module-resolution
error (`ERR_MODULE_NOT_FOUND`, `Cannot find package`, `Cannot find
module`) for a scoped workspace package (`@<scope>/...` — commonly the
repo's `-stable` self-alias).

**Why:** `pnpm` symlinks the main checkout's `node_modules`; after a
`git worktree remove` / `prune` those links can dangle into the removed
worktree, so the next hook or script importing a workspace package dies
with `Cannot find package '@socketsecurity/lib-stable'`. A pre-commit
hook hitting this blocks every commit — easy to misread as a content
failure.

**Action:** prints a reminder to run `pnpm install` in the MAIN checkout
to relink, then retry. Does not run the install or retry, and does not
suggest `--no-verify` (the break is transient, not a reason to bypass).

**Bypass:** none — informational only (exit 0).
