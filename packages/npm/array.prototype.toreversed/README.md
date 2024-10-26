# @socketregistry/array.prototype.toreversed

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.prototype.toreversed)](https://socket.dev/npm/package/@socketregistry/array.prototype.toreversed)
[![CI - @socketregistry/array.prototype.toreversed](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`array.prototype.toreversed`](https://socket.dev/npm/package/array.prototype.toreversed)
> complete with TypeScript types.

## Installation

### Install as a package override

[`socket`](https://socket.dev/npm/package/socket) CLI will automagically
:sparkles: populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx socket optimize
```

Prefer to do it yourself? Add `@socketregistry/array.prototype.toreversed` to
your `package.json`.

```json
{
  "overrides": {
    "array.prototype.toreversed": "npm:@socketregistry/array.prototype.toreversed@^1"
  },
  "resolutions": {
    "array.prototype.toreversed": "npm:@socketregistry/array.prototype.toreversed@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/array.prototype.toreversed
```

## Requirements

Node >= `18.20.4`
