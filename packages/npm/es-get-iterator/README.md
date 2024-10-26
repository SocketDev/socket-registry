# @socketregistry/es-get-iterator

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/es-get-iterator)](https://socket.dev/npm/package/@socketregistry/es-get-iterator)
[![CI - @socketregistry/es-get-iterator](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`es-get-iterator`](https://socket.dev/npm/package/es-get-iterator) complete
> with TypeScript types.

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

Prefer to do it yourself? Add `@socketregistry/es-get-iterator` to your
`package.json`.

```json
{
  "overrides": {
    "es-get-iterator": "npm:@socketregistry/es-get-iterator@^1"
  },
  "resolutions": {
    "es-get-iterator": "npm:@socketregistry/es-get-iterator@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/es-get-iterator
```

## Requirements

Node >= `18.20.4`
