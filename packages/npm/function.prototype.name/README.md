# @socketregistry/function.prototype.name

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/function.prototype.name)](https://socket.dev/npm/package/@socketregistry/function.prototype.name)
[![CI - @socketregistry/function.prototype.name](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`function.prototype.name`](https://socket.dev/npm/package/function.prototype.name)
> complete with TypeScript types.

## Installation

### Install as a package override

[`socket`](https://socket.dev/npm/package/socket) will automagically :sparkles:
populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx socket optimize
```

Prefer to do it yourself? You may manually add
`@socketregistry/function.prototype.name` to your `package.json`.

```json
{
  "overrides": {
    "function.prototype.name": "npm:@socketregistry/function.prototype.name@^1"
  },
  "resolutions": {
    "function.prototype.name": "npm:@socketregistry/function.prototype.name@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/function.prototype.name
```

## Requirements

Node >= `18.20.4`
