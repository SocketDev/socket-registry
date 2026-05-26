# gh-token-hygiene-guard

PreToolUse hook on Bash commands invoking `gh`. Enforces four
invariants motivated by the Nx Console supply-chain compromise:

1. **Keychain storage.** Token must live in the OS keychain
   (`gh auth status` reports `(keyring)`). On-disk
   `~/.config/gh/hosts.yml` is rejected; no bypass.
2. **8-hour token age cap.** The hook stamps a local timestamp on
   `gh auth login` / `gh auth refresh` and blocks every non-auth `gh`
   command after 8 hours. Self-recovery: `gh auth refresh -h
   github.com` is always allowed (re-stamps the file).
3. **`workflow` scope is on-demand, strictly single-use.** Default
   token scopes are `read:org, repo`. To dispatch a workflow:
   - Type `Allow workflow-scope bypass` in chat (chat-only authorization)
   - Hook then requires **physical-presence authentication**: Touch ID
     via `sudo` PAM if configured, otherwise an `osascript` password
     dialog validated against the user's account
   - On successful auth, `gh auth refresh -h github.com -s workflow` is
     let through and the hook records `~/.claude/gh-workflow-grant`
   - The next workflow dispatch consumes the grant (deletes the file)
   - A second dispatch requires a fresh bypass + auth cycle
4. **Workflow scope revoke is always allowed** without bypass or auth
   (so users can clean up after a dispatch).

## Operational state

- `~/.claude/gh-token-issued-at` — local timestamp of last
  `gh auth login` / `gh auth refresh`. Drives the 8h age check.
- `~/.claude/gh-workflow-grant` — presence-only marker for an
  unconsumed workflow-dispatch authorization. Deleted as soon as a
  dispatch is let through.

## Escape hatches

None. The hook is failsafe-deny on its core invariants. There is no
test-only env-var override — the OS-auth path (Touch ID + osascript +
dscl on absolute `/usr/bin/` paths) is intentionally unreachable in
unit tests; the auth path is exercised by manual smoke-testing.

## Touch ID setup (one time, recommended on macOS Sonoma+)

The hook prompts you with this on first use if Touch ID isn't
configured. Run once to enable Touch ID as a sudo auth method
(falls back to password if Touch ID isn't available):

```sh
sudo tee /etc/pam.d/sudo_local <<'EOF'
auth       sufficient     pam_tid.so
EOF
```

> **Copy-paste verbatim.** The closing `EOF` must start at column 0
> (no leading whitespace) or the heredoc will not terminate and
> your shell will hang waiting for input. Same constraint applies
> to the body lines — they're sent to `tee` as-is. If you indented
> this block when transcribing it, strip the indent.

After this, every bypass-authorized refresh pops a Touch ID dialog
(no password typing required).

### What the command does, line by line

- **`sudo tee /etc/pam.d/sudo_local`** — writes to `/etc/pam.d/sudo_local`, which requires root; `sudo tee` is the canonical "write a file as root from a normal shell" pattern. `tee` reads stdin and writes the file; `sudo` elevates `tee`. Plain `> /etc/pam.d/sudo_local` redirection wouldn't work because the redirect happens in your unprivileged shell BEFORE sudo runs. This first sudo invocation prompts for your password the conventional way (since Touch ID isn't set up yet); every sudo after this point gets the Touch ID option.

- **`/etc/pam.d/sudo_local`** — the official macOS PAM extension point introduced in macOS Sonoma (14). Apple created it so users can layer auth methods on sudo without modifying `/etc/pam.d/sudo`, which is replaced on every macOS update. `/etc/pam.d/sudo`'s first line is `auth include sudo_local`, which pulls in whatever you put here. The file doesn't exist by default; creating it is what activates the extension.

- **`<<'EOF' ... EOF`** — a [heredoc](https://en.wikipedia.org/wiki/Here_document). Everything between the markers becomes stdin for `tee`. The single quotes around the opening `'EOF'` disable shell variable / backtick expansion inside the body — `$foo` and `` ` `` stay literal. Conservative default for config files.

- **`auth       sufficient     pam_tid.so`** — the PAM directive. Three fields:
  - **`auth`** — the module-type. PAM stacks split into `auth`, `account`, `password`, and `session`; only `auth` modules participate in the "prove who you are" phase that sudo cares about.
  - **`sufficient`** — the control flag. PAM evaluates auth modules top-to-bottom; `sufficient` means "if this succeeds, the whole stack succeeds; if it fails, ignore and try the next module". So Touch ID is given first chance, and if you decline the dialog or no fingerprint is enrolled, sudo silently falls through to the password prompt.
  - **`pam_tid.so`** — Apple's Touch ID PAM module shipped at `/usr/lib/pam/pam_tid.so.2`. Pops the system Touch ID dialog and reports success / failure to PAM. Requires Touch ID hardware (M-series MacBook, Touch ID Magic Keyboard, or unlocked Apple Watch).

### Why `sufficient` and not `required`?

The four PAM control flags:

- **`required`** — must succeed; failure recorded but stack keeps evaluating
- **`requisite`** — must succeed; failure short-circuits immediately
- **`sufficient`** — succeeds the whole stack on success; failure ignored, falls through
- **`optional`** — result ignored

We use `sufficient` because Touch ID should be an **alternative** to typing the password, not a precondition. Lid closed, no fingerprint enrolled, declined dialog, broken sensor → sudo silently moves to the password path. No friction, no lockout.

### Why not edit `/etc/pam.d/sudo` directly?

You can; it's a text file. But macOS updates replace it on every system upgrade — your edit silently disappears after the next macOS minor release. `sudo_local` is preserved across upgrades; that's its whole purpose.

### Verifying it works

```sh
sudo -k          # invalidate any cached auth
sudo -v          # next sudo should pop the Touch ID dialog
```

If Touch ID dialog appears → good. If you see a password prompt → Touch ID isn't enrolled, or you're on hardware without Touch ID, or the file path / content is wrong. Re-run the setup and double-check.

### Undoing it

```sh
sudo rm /etc/pam.d/sudo_local
```

Back to default (password only). The hook's auth flow still works via the osascript password dialog path — slower but functional.

## Tests

Run `node --test test/index.test.mts` (the `pnpm test` wrapper goes
through a workspace install that currently has unrelated drift).

14 cases cover:

- non-`gh` Bash commands pass
- on-disk storage → block
- `gh auth status` failure → pass through (gh handles)
- workflow dispatch + no scope → block
- workflow dispatch + scope + no grant → block
- workflow dispatch + scope + grant → pass + consume grant
- `gh auth refresh -s workflow` + bypass + auth pass → record grant
- `gh auth refresh -s workflow` + bypass + auth deny → block
- `gh auth refresh -s workflow` + no bypass → block
- `gh auth refresh -r workflow` (revoke) → pass without bypass
- `gh api .../dispatches` (api shape) → blocked
- token >8h old → block
- token >8h old + `gh auth refresh` → pass (self-recovery)
