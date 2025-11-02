# @socketregistry/is-shared-array-buffer
[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-shared-array-buffer)](https://socket.dev/npm/package/@socketregistry/is-shared-array-buffer)
[![CI - @socketregistry/is-shared-array-buffer](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

>A tested zero dependency drop-in replacement of [`is-shared-array-buffer`](https://socket.dev/npm/package/is-shared-array-buffer) complete with TypeScript types.


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

Prefer to do it yourself? Add `@socketregistry/is-shared-array-buffer`
to your `package.json`.

```json
{
  "overrides": {
    "is-shared-array-buffer": "npm:@socketregistry/is-shared-array-buffer@^1"
  },
  "resolutions": {
    "is-shared-array-buffer": "npm:@socketregistry/is-shared-array-buffer@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
pnpm install @socketregistry/is-shared-array-buffer
```

## Requirements

Node >= `18`