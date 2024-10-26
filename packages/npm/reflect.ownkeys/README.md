# @socketregistry/reflect.ownkeys

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/reflect.ownkeys)](https://socket.dev/npm/package/@socketregistry/reflect.ownkeys)
[![CI - @socketregistry/reflect.ownkeys](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`reflect.ownkeys`](https://socket.dev/npm/package/reflect.ownkeys) complete
> with TypeScript types.

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

Prefer to do it yourself? Add `@socketregistry/reflect.ownkeys` to your
`package.json`.

```json
{
  "overrides": {
    "reflect.ownkeys": "npm:@socketregistry/reflect.ownkeys@^1"
  },
  "resolutions": {
    "reflect.ownkeys": "npm:@socketregistry/reflect.ownkeys@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/reflect.ownkeys
```

## Requirements

Node >= `18.20.4`
