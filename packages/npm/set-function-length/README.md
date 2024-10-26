# @socketregistry/set-function-length

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/set-function-length)](https://socket.dev/npm/package/@socketregistry/set-function-length)
[![CI - @socketregistry/set-function-length](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`set-function-length`](https://socket.dev/npm/package/set-function-length)
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

Prefer to do it yourself? Add `@socketregistry/set-function-length` to your
`package.json`.

```json
{
  "overrides": {
    "set-function-length": "npm:@socketregistry/set-function-length@^1"
  },
  "resolutions": {
    "set-function-length": "npm:@socketregistry/set-function-length@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/set-function-length
```

## Requirements

Node >= `18.20.4`
