# @socketregistry/get-symbol-description

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/get-symbol-description)](https://socket.dev/npm/package/@socketregistry/get-symbol-description)
[![CI - @socketregistry/get-symbol-description](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`get-symbol-description`](https://socket.dev/npm/package/get-symbol-description)
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

Prefer to do it yourself? Add `@socketregistry/get-symbol-description` to your
`package.json`.

```json
{
  "overrides": {
    "get-symbol-description": "npm:@socketregistry/get-symbol-description@^1"
  },
  "resolutions": {
    "get-symbol-description": "npm:@socketregistry/get-symbol-description@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/get-symbol-description
```

## Requirements

Node >= `18.20.4`
