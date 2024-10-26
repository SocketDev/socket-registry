# @socketregistry/indent-string

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/indent-string)](https://socket.dev/npm/package/@socketregistry/indent-string)
[![CI - @socketregistry/indent-string](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency CJS/ESM compatible drop-in replacement of
> [`indent-string`](https://socket.dev/npm/package/indent-string) complete with
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

Prefer to do it yourself? Add `@socketregistry/indent-string` to your
`package.json`.

```json
{
  "overrides": {
    "indent-string": "npm:@socketregistry/indent-string@^1"
  },
  "resolutions": {
    "indent-string": "npm:@socketregistry/indent-string@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/indent-string
```

## Requirements

Node >= `18.20.4`
