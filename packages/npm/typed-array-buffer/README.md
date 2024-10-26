# @socketregistry/typed-array-buffer

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/typed-array-buffer)](https://socket.dev/npm/package/@socketregistry/typed-array-buffer)
[![CI - @socketregistry/typed-array-buffer](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`typed-array-buffer`](https://socket.dev/npm/package/typed-array-buffer)
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

Prefer to do it yourself? Add `@socketregistry/typed-array-buffer` to your
`package.json`.

```json
{
  "overrides": {
    "typed-array-buffer": "npm:@socketregistry/typed-array-buffer@^1"
  },
  "resolutions": {
    "typed-array-buffer": "npm:@socketregistry/typed-array-buffer@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/typed-array-buffer
```

## Requirements

Node >= `18.20.4`
