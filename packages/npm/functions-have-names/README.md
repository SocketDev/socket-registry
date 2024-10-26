# @socketregistry/functions-have-names

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/functions-have-names)](https://socket.dev/npm/package/@socketregistry/functions-have-names)
[![CI - @socketregistry/functions-have-names](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`functions-have-names`](https://socket.dev/npm/package/functions-have-names)
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

Prefer to do it yourself? Add `@socketregistry/functions-have-names` to your
`package.json`.

```json
{
  "overrides": {
    "functions-have-names": "npm:@socketregistry/functions-have-names@^1"
  },
  "resolutions": {
    "functions-have-names": "npm:@socketregistry/functions-have-names@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/functions-have-names
```

## Requirements

Node >= `18.20.4`
