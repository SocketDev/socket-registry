#!/usr/bin/env bash
set -euo pipefail

node_version="$(tr -d '\r\n' < .node-version)"
if [[ ! "$node_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Expected an exact version in .node-version.' >&2
  exit 1
fi

tool_dir="$(mktemp -d "$RUNNER_TEMP/registry-tools.XXXXXX")"
trap 'rm -r -- "$tool_dir"' EXIT

if [[ "$(node --version 2>/dev/null || true)" != "v$node_version" ]]; then
  node_bin="${RUNNER_TOOL_CACHE:-}/node/$node_version/x64/bin"
  if [[ ! -x "$node_bin/node" ]]; then
    archive="node-v$node_version-linux-x64.tar.xz"
    base_url="https://nodejs.org/dist/v$node_version"
    curl --fail --silent --show-error --retry 3 "$base_url/$archive" -o "$tool_dir/$archive"
    curl --fail --silent --show-error --retry 3 "$base_url/SHASUMS256.txt" -o "$tool_dir/SHASUMS256.txt"
    awk -v archive="$archive" '$2 == archive && $1 ~ /^[0-9a-f]+$/ && length($1) == 64' \
      "$tool_dir/SHASUMS256.txt" > "$tool_dir/node.sha256"
    (cd "$tool_dir" && sha256sum --check --strict node.sha256)
    tar -xJf "$tool_dir/$archive" -C "$tool_dir"
    node_bin="$tool_dir/node-v$node_version-linux-x64/bin"
  fi
  export PATH="$node_bin:$PATH"
fi
test "$(node --version)" = "v$node_version"

pnpm_version="$(node --input-type=commonjs -e '
  const match = /^pnpm@(\d+\.\d+\.\d+)$/.exec(require("./package.json").packageManager)
  if (!match) throw new Error("packageManager must pin an exact pnpm version")
  process.stdout.write(match[1])
')"
npm_version=12.2.0
npm install --global --prefix "$tool_dir" --ignore-scripts "npm@$npm_version" "pnpm@$pnpm_version"
# The npm package's install-free shim has no shebang. Use the Node launcher.
chmod +x "$tool_dir/lib/node_modules/pnpm/bin/pnpm.mjs"
ln -sf ../lib/node_modules/pnpm/bin/pnpm.mjs "$tool_dir/bin/pnpm"
export PATH="$tool_dir/bin:$PATH"
test "$(npm --version)" = "$npm_version"
test "$(pnpm --version)" = "$pnpm_version"
pnpm install --frozen-lockfile
"$@"
