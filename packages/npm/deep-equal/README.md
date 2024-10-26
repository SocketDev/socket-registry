# @socketregistry/deep-equal

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/deep-equal)](https://socket.dev/npm/package/@socketregistry/deep-equal)
[![CI - @socketregistry/deep-equal](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`deep-equal`](https://socket.dev/npm/package/deep-equal) complete with
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

Prefer to do it yourself? Add `@socketregistry/deep-equal` to your
`package.json`.

```json
{
  "overrides": {
    "deep-equal": "npm:@socketregistry/deep-equal@^1"
  },
  "resolutions": {
    "deep-equal": "npm:@socketregistry/deep-equal@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/deep-equal
```

## Requirements

Node >= `18.20.4`
