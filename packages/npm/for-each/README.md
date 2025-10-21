# @socketregistry/for-each

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/for-each)](https://socket.dev/npm/package/@socketregistry/for-each)
[![CI - @socketregistry/for-each](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

> A tested zero dependency drop-in replacement of
> [`for-each`](https://socket.dev/npm/package/for-each) complete with TypeScript
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

Prefer to do it yourself? Add `@socketregistry/for-each` to your `package.json`.

```json
{
  "overrides": {
    "for-each": "npm:@socketregistry/for-each@^1"
  },
  "resolutions": {
    "for-each": "npm:@socketregistry/for-each@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/for-each
```

## Requirements

Node >= `18.20.4`
