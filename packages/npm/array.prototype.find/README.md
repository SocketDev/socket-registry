# @socketregistry/array.prototype.find

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.prototype.find)](https://socket.dev/npm/package/@socketregistry/array.prototype.find)
[![CI - @socketregistry/array.prototype.find](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`array.prototype.find`](https://socket.dev/npm/package/array.prototype.find)
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

Prefer to do it yourself? Add `@socketregistry/array.prototype.find` to your
`package.json`.

```json
{
  "overrides": {
    "array.prototype.find": "npm:@socketregistry/array.prototype.find@^1"
  },
  "resolutions": {
    "array.prototype.find": "npm:@socketregistry/array.prototype.find@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/array.prototype.find
```

## Requirements

Node >= `18.20.4`
