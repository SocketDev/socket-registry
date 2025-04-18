# @socketregistry/asynciterator.prototype

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/asynciterator.prototype)](https://socket.dev/npm/package/@socketregistry/asynciterator.prototype)
[![CI - @socketregistry/asynciterator.prototype](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`asynciterator.prototype`](https://socket.dev/npm/package/asynciterator.prototype)
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

Prefer to do it yourself? Add `@socketregistry/asynciterator.prototype` to your
`package.json`.

```json
{
  "overrides": {
    "asynciterator.prototype": "npm:@socketregistry/asynciterator.prototype@^1"
  },
  "resolutions": {
    "asynciterator.prototype": "npm:@socketregistry/asynciterator.prototype@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/asynciterator.prototype
```

## Requirements

Node >= `18.20.4`
