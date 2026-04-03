---
name: cycle-bot-gpg-key
description: Generate a new GPG key for socket-bot commit signing, copy to clipboard, and walk through adding it to GitHub and repo secrets.
user-invocable: true
allowed-tools: Bash, Read, AskUserQuestion
---

# cycle-bot-gpg-key

<task>
Generate a new GPG signing key for the socket-bot GitHub account, guide the user through uploading the public key to GitHub, and store the private key as repo secrets via `gh secret set`.
</task>

<context>
**What is this?**
This skill cycles (regenerates) the GPG key pair used by `setup-git-signing` / `cleanup-git-signing` composite actions. The key allows CI workflows to create verified signed commits as `socket-bot`.

**Key identity:**
- Name: `socket-bot`
- Email: `socket-bot@users.noreply.github.com`
- Algorithm: ed25519 (EdDSA)
- No passphrase (required for non-interactive CI usage), no expiry

**Requires:** macOS (uses `pbcopy`), GnuPG >= 2.2.12, `gh` CLI authenticated.
</context>

<instructions>

## Step 1: Clean up any existing socket-bot keys

```bash
# Remove existing socket-bot keys from the local keyring (safe — these are local only).
for FPR in $(gpg --list-secret-keys --with-colons socket-bot@users.noreply.github.com 2>/dev/null | grep '^fpr' | cut -d: -f10); do
  gpg --batch --yes --delete-secret-and-public-key "$FPR" 2>/dev/null || true
done
echo "Local keyring cleaned."
```

## Step 2: Generate a new GPG key

```bash
gpg --batch --gen-key <<KEYGEN
%no-protection
Key-Type: eddsa
Key-Curve: ed25519
Name-Real: socket-bot
Name-Email: socket-bot@users.noreply.github.com
Expire-Date: 0
KEYGEN
echo "Key generated."
```

## Step 3: Verify the key and display fingerprint

```bash
# Verify the key is ed25519 (algorithm ID 22 = EdDSA).
ALGO=$(gpg --list-keys --with-colons socket-bot@users.noreply.github.com | grep '^pub' | cut -d: -f4)
if [ "$ALGO" != "22" ]; then
  echo "ERROR: Expected EdDSA (22) but got algorithm $ALGO"
  exit 1
fi
echo "Verified: key is ed25519 (EdDSA)"

# Display fingerprint for reference.
gpg --fingerprint socket-bot@users.noreply.github.com
```

## Step 4: Copy the PUBLIC key to the clipboard

```bash
gpg --armor --export socket-bot@users.noreply.github.com | pbcopy
echo "Public key copied to clipboard."
```

Tell the user:

> The **public key** is now on your clipboard.
>
> Add it to the **socket-bot** GitHub account:
> 1. Log in as `socket-bot` (or have an admin do this)
> 2. Go to **Settings > SSH and GPG keys > New GPG key**
> 3. Paste the clipboard contents and save
>
> If there are old GPG keys listed on the bot account, remove them — they're from a previous cycle.
>
> This is what makes commits show as **Verified** on GitHub.

Then use **AskUserQuestion** to pause and wait for the user to confirm they have added the public key before continuing.

## Step 5: Store the PRIVATE key as repo secrets

Ask the user which repos need the secret. Default list:
- `SocketDev/socket-registry`

Then for each repo, pipe the private key directly into `gh secret set` (never touches the clipboard):

```bash
gpg --armor --export-secret-keys socket-bot@users.noreply.github.com | \
  gh secret set BOT_GPG_PRIVATE_KEY --repo SocketDev/socket-registry
echo "Secret set for SocketDev/socket-registry"
```

Repeat for any additional repos the user specifies. Report success/failure for each.

## Step 6: Clean up local keyring and clipboard

```bash
# Remove key from local keyring.
for FPR in $(gpg --list-secret-keys --with-colons socket-bot@users.noreply.github.com 2>/dev/null | grep '^fpr' | cut -d: -f10); do
  gpg --batch --yes --delete-secret-and-public-key "$FPR" 2>/dev/null || true
done

# Clear clipboard.
echo '' | pbcopy

echo "Local keyring cleaned and clipboard cleared — no key material remains on this machine."
```

Tell the user:

> Done! Key cycle complete.
>
> **Summary:**
> - Public key → socket-bot's GitHub GPG keys
> - Private key → `BOT_GPG_PRIVATE_KEY` repo secret(s) (via `gh secret set`)
> - Local machine → cleaned, no key material remains
>
> Commits made by `setup-git-signing` in CI will now show as **Verified**.

</instructions>
