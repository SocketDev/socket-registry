# @socketregistry/object-keys

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/object-keys)](https://socket.dev/npm/package/@socketregistry/object-keys)
[![CI - @socketregistry/object-keys](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`object-keys`](https://socket.dev/npm/package/object-keys) complete with
> TypeScript types.

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

Prefer to do it yourself? Add `@socketregistry/object-keys` to your
`package.json`.

```json
{
  "overrides": {
    "object-keys": "npm:@socketregistry/object-keys@^1"
  },
  "resolutions": {
    "object-keys": "npm:@socketregistry/object-keys@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/object-keys
```

## Requirements

Node >= `18.20.4`
