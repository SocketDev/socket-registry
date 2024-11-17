# @socketregistry/yocto-spinner

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/yocto-spinner)](https://socket.dev/npm/package/@socketregistry/yocto-spinner)
[![CI - @socketregistry/yocto-spinner](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency CJS/ESM compatible drop-in replacement of
> [`yocto-spinner`](https://socket.dev/npm/package/yocto-spinner) complete with
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

Prefer to do it yourself? Add `@socketregistry/yocto-spinner` to your
`package.json`.

```json
{
  "overrides": {
    "yocto-spinner": "npm:@socketregistry/yocto-spinner@^1"
  },
  "resolutions": {
    "yocto-spinner": "npm:@socketregistry/yocto-spinner@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/yocto-spinner
```

## Requirements

Node >= `18.20.4`
