# @socketregistry/object.groupby

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/object.groupby)](https://socket.dev/npm/package/@socketregistry/object.groupby)
[![CI - @socketregistry/object.groupby](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`object.groupby`](https://socket.dev/npm/package/object.groupby) complete
> with TypeScript types.

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

Prefer to do it yourself? Add `@socketregistry/object.groupby` to your
`package.json`.

```json
{
  "overrides": {
    "object.groupby": "npm:@socketregistry/object.groupby@^1"
  },
  "resolutions": {
    "object.groupby": "npm:@socketregistry/object.groupby@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/object.groupby
```

## Requirements

Node >= `18.20.4`
