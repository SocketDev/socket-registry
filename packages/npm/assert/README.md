# @socketregistry/assert

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/assert)](https://socket.dev/npm/package/@socketregistry/assert)
[![CI - @socketregistry/assert](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested low dependency drop-in replacement of
> [`assert`](https://socket.dev/npm/package/assert) complete with TypeScript
> types.

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

Prefer to do it yourself? Add `@socketregistry/assert` to your `package.json`.

```json
{
  "overrides": {
    "assert": "npm:@socketregistry/assert@^1"
  },
  "resolutions": {
    "assert": "npm:@socketregistry/assert@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/assert
```

## Requirements

Node >= `18.20.4`
