# @socketregistry/array.of

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.of)](https://socket.dev/npm/package/@socketregistry/array.of)
[![CI - @socketregistry/array.of](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

> A tested zero dependency drop-in replacement of
> [`array.of`](https://socket.dev/npm/package/array.of) complete with TypeScript
> types.

## Installation

### Install as a package override

[`socket`](https://socket.dev/npm/package/socket) CLI will automagically ✨
populate
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) of
your `package.json`.

```sh
npx socket optimize
```

Prefer to do it yourself? Add `@socketregistry/array.of` to your `package.json`.

```json
{
  "overrides": {
    "array.of": "npm:@socketregistry/array.of@^1"
  },
  "resolutions": {
    "array.of": "npm:@socketregistry/array.of@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/array.of
```

## Requirements

Node >= `18.20.4`
