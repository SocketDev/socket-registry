# @socketregistry/is-bigint

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-bigint)](https://socket.dev/npm/package/@socketregistry/is-bigint)
[![CI - @socketregistry/is-bigint](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`is-bigint`](https://socket.dev/npm/package/is-bigint) complete with
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

Prefer to do it yourself? Add `@socketregistry/is-bigint` to your
`package.json`.

```json
{
  "overrides": {
    "is-bigint": "npm:@socketregistry/is-bigint@^1"
  },
  "resolutions": {
    "is-bigint": "npm:@socketregistry/is-bigint@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/is-bigint
```

## Requirements

Node >= `18.20.4`
