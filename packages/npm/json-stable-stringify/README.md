# @socketregistry/json-stable-stringify

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/json-stable-stringify)](https://socket.dev/npm/package/@socketregistry/json-stable-stringify)
[![CI - @socketregistry/json-stable-stringify](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> An enhanced and tested zero dependency drop-in replacement of
> [`json-stable-stringify`](https://socket.dev/npm/package/json-stable-stringify)
> complete with TypeScript types.

### Enhancements

- TODO: List enhancements

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

Prefer to do it yourself? Add `@socketregistry/json-stable-stringify` to your
`package.json`.

```json
{
  "overrides": {
    "json-stable-stringify": "npm:@socketregistry/json-stable-stringify@^1"
  },
  "resolutions": {
    "json-stable-stringify": "npm:@socketregistry/json-stable-stringify@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/json-stable-stringify
```

## Requirements

Node >= `18.20.4`
