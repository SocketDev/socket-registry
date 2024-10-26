# @socketregistry/is-generator-function

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-generator-function)](https://socket.dev/npm/package/@socketregistry/is-generator-function)
[![CI - @socketregistry/is-generator-function](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`is-generator-function`](https://socket.dev/npm/package/is-generator-function)
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

Prefer to do it yourself? Add `@socketregistry/is-generator-function` to your
`package.json`.

```json
{
  "overrides": {
    "is-generator-function": "npm:@socketregistry/is-generator-function@^1"
  },
  "resolutions": {
    "is-generator-function": "npm:@socketregistry/is-generator-function@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/is-generator-function
```

## Requirements

Node >= `18.20.4`
