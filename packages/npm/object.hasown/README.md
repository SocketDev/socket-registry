# @socketregistry/object.hasown

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/object.hasown)](https://socket.dev/npm/package/@socketregistry/object.hasown)
[![CI - @socketregistry/object.hasown](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`object.hasown`](https://socket.dev/npm/package/object.hasown) complete with
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

Prefer to do it yourself? Add `@socketregistry/object.hasown` to your
`package.json`.

```json
{
  "overrides": {
    "object.hasown": "npm:@socketregistry/object.hasown@^1"
  },
  "resolutions": {
    "object.hasown": "npm:@socketregistry/object.hasown@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/object.hasown
```

## Requirements

Node >= `18.20.4`
