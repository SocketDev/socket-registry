# @socketregistry/is-number-object

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-number-object)](https://socket.dev/npm/package/@socketregistry/is-number-object)
[![CI - @socketregistry/is-number-object](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`is-number-object`](https://socket.dev/npm/package/is-number-object) complete
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

Prefer to do it yourself? Add `@socketregistry/is-number-object` to your
`package.json`.

```json
{
  "overrides": {
    "is-number-object": "npm:@socketregistry/is-number-object@^1"
  },
  "resolutions": {
    "is-number-object": "npm:@socketregistry/is-number-object@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/is-number-object
```

## Requirements

Node >= `18.20.4`
