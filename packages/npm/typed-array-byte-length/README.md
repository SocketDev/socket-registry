# @socketregistry/typed-array-byte-length

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/typed-array-byte-length)](https://socket.dev/npm/package/@socketregistry/typed-array-byte-length)
[![CI - @socketregistry/typed-array-byte-length](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`typed-array-byte-length`](https://socket.dev/npm/package/typed-array-byte-length)
> complete with TypeScript types.

## Installation

### Install as a package override

[`@socketsecurity/cli`](https://socket.dev/npm/package/@socketsecurity/cli) will
automagically :sparkles: populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

Prefer to do it yourself? You may manually add
`@socketregistry/typed-array-byte-length` to your `package.json`.

```json
{
  "overrides": {
    "typed-array-byte-length": "npm:@socketregistry/typed-array-byte-length@^1"
  },
  "resolutions": {
    "typed-array-byte-length": "npm:@socketregistry/typed-array-byte-length@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/typed-array-byte-length
```

## Requirements

Node >= `18.20.4`
