# @socketregistry/string.prototype.trimend

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/string.prototype.trimend)](https://socket.dev/npm/package/@socketregistry/string.prototype.trimend)
[![CI - @socketregistry/string.prototype.trimend](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`string.prototype.trimend`](https://socket.dev/npm/package/string.prototype.trimend)
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

Prefer to do it yourself? Add `@socketregistry/string.prototype.trimend` to your
`package.json`.

```json
{
  "overrides": {
    "string.prototype.trimend": "npm:@socketregistry/string.prototype.trimend@^1"
  },
  "resolutions": {
    "string.prototype.trimend": "npm:@socketregistry/string.prototype.trimend@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/string.prototype.trimend
```

## Requirements

Node >= `18.20.4`
