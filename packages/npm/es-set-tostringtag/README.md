# @socketregistry/es-set-tostringtag

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/es-set-tostringtag)](https://socket.dev/npm/package/@socketregistry/es-set-tostringtag)
[![CI - @socketregistry/es-set-tostringtag](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`es-set-tostringtag`](https://socket.dev/npm/package/es-set-tostringtag)
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

Prefer to do it yourself? Add `@socketregistry/es-set-tostringtag` to your
`package.json`.

```json
{
  "overrides": {
    "es-set-tostringtag": "npm:@socketregistry/es-set-tostringtag@^1"
  },
  "resolutions": {
    "es-set-tostringtag": "npm:@socketregistry/es-set-tostringtag@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/es-set-tostringtag
```

## Requirements

Node >= `18.20.4`
