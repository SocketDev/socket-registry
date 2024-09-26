# @socketregistry/array.prototype.find

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.prototype.find)](https://socket.dev/npm/package/@socketregistry/array.prototype.find)
[![CI - socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`array.prototype.find`](https://www.npmjs.com/package/array.prototype.find).

## Installation

### Install as a package override

[`@socketsecurity/cli`](https://www.npmjs.com/package/@socketsecurity/cli) will
automagically :sparkles: populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

Prefer to do it yourself? You may manually add
`@socketregistry/array.prototype.find` to your `package.json`.

```json
{
  "overrides": {
    "array.prototype.find": "npm:@socketregistry/array.prototype.find@^1"
  },
  "resolutions": {
    "array.prototype.find": "npm:@socketregistry/array.prototype.find@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/array.prototype.find
```

## Requirements

Node &gt;=18.20.4
