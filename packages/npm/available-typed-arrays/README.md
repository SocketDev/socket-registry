# @socketregistry/available-typed-arrays

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/available-typed-arrays)](https://socket.dev/npm/package/@socketregistry/available-typed-arrays)
[![CI - @socketregistry/available-typed-arrays](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`available-typed-arrays`](https://socket.dev/npm/package/available-typed-arrays)
> complete with TypeScript types.

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

Prefer to do it yourself? Add `@socketregistry/available-typed-arrays` to your
`package.json`.

```json
{
  "overrides": {
    "available-typed-arrays": "npm:@socketregistry/available-typed-arrays@^1"
  },
  "resolutions": {
    "available-typed-arrays": "npm:@socketregistry/available-typed-arrays@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/available-typed-arrays
```

## Requirements

Node >= `18.20.4`
