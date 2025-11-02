# @socketregistry/safe-buffer
[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/safe-buffer)](https://socket.dev/npm/package/@socketregistry/safe-buffer)
[![CI - @socketregistry/safe-buffer](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

>A tested zero dependency drop-in replacement of [`safe-buffer`](https://socket.dev/npm/package/safe-buffer) complete with TypeScript types.


## Installation

### Install as a package override

[`socket`](https://socket.dev/npm/package/socket)
CLI will automagically ✨ populate
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions)
of your `package.json`.

```sh
npx socket optimize
```

Prefer to do it yourself? Add `@socketregistry/safe-buffer`
to your `package.json`.

```json
{
  "overrides": {
    "safe-buffer": "npm:@socketregistry/safe-buffer@^1"
  },
  "resolutions": {
    "safe-buffer": "npm:@socketregistry/safe-buffer@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
pnpm install @socketregistry/safe-buffer
```

## Requirements

Node >= `18`