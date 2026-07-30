# @socketregistry/own-keys

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/own-keys)](https://socket.dev/npm/package/@socketregistry/own-keys)
[![CI - @socketregistry/own-keys](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

> A tested zero dependency drop-in replacement of [`own-keys`](https://socket.dev/npm/package/own-keys) complete with TypeScript types.

## Installation

### Install as a package override

[`socket`](https://socket.dev/npm/package/socket)
CLI will automagically ✨ populate
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions)
of your `package.json`.

```sh
pnpm install -g socket@1.1.147
socket optimize
```

Prefer to do it yourself? Add `@socketregistry/own-keys`
to your `package.json`.

```json
{
  "overrides": {
    "own-keys": "npm:@socketregistry/own-keys@^1"
  },
  "resolutions": {
    "own-keys": "npm:@socketregistry/own-keys@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
pnpm install @socketregistry/own-keys
```

## Requirements

Node >= `24`
