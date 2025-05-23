# @socketregistry/array.prototype.flatmap

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.prototype.flatmap)](https://socket.dev/npm/package/@socketregistry/array.prototype.flatmap)
[![CI - @socketregistry/array.prototype.flatmap](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`array.prototype.flatmap`](https://socket.dev/npm/package/array.prototype.flatmap)
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

Prefer to do it yourself? Add `@socketregistry/array.prototype.flatmap` to your
`package.json`.

```json
{
  "overrides": {
    "array.prototype.flatmap": "npm:@socketregistry/array.prototype.flatmap@^1"
  },
  "resolutions": {
    "array.prototype.flatmap": "npm:@socketregistry/array.prototype.flatmap@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/array.prototype.flatmap
```

## Requirements

Node >= `18.20.4`
