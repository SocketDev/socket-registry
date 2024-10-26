# @socketregistry/hyrious\_\_bun.lockb

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/hyrious__bun.lockb)](https://socket.dev/npm/package/@socketregistry/hyrious__bun.lockb)
[![CI - @socketregistry/hyrious__bun.lockb](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency CJS/ESM compatible drop-in replacement of
> [`@hyrious/bun.lockb`](https://socket.dev/npm/package/@hyrious/bun.lockb)
> complete with TypeScript types.

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

Prefer to do it yourself? Add `@socketregistry/hyrious__bun.lockb` to your
`package.json`.

```json
{
  "overrides": {
    "@hyrious/bun.lockb": "npm:@socketregistry/hyrious__bun.lockb@^1"
  },
  "resolutions": {
    "@hyrious/bun.lockb": "npm:@socketregistry/hyrious__bun.lockb@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/hyrious__bun.lockb
```

## Requirements

Node >= `18.20.4`
