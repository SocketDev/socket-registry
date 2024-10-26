# @socketregistry/array-buffer-byte-length

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array-buffer-byte-length)](https://socket.dev/npm/package/@socketregistry/array-buffer-byte-length)
[![CI - @socketregistry/array-buffer-byte-length](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`array-buffer-byte-length`](https://socket.dev/npm/package/array-buffer-byte-length)
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

Prefer to do it yourself? Add `@socketregistry/array-buffer-byte-length` to your
`package.json`.

```json
{
  "overrides": {
    "array-buffer-byte-length": "npm:@socketregistry/array-buffer-byte-length@^1"
  },
  "resolutions": {
    "array-buffer-byte-length": "npm:@socketregistry/array-buffer-byte-length@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/array-buffer-byte-length
```

## Requirements

Node >= `18.20.4`
