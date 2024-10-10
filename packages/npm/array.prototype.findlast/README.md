# @socketregistry/array.prototype.findlast

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.prototype.findlast)](https://socket.dev/npm/package/@socketregistry/array.prototype.findlast)
[![CI - @socketregistry/array.prototype.findlast](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`array.prototype.findlast`](https://www.npmjs.com/package/array.prototype.findlast)
> complete with TypeScript types.

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
`@socketregistry/array.prototype.findlast` to your `package.json`.

```json
{
  "overrides": {
    "array.prototype.findlast": "npm:@socketregistry/array.prototype.findlast@^1"
  },
  "resolutions": {
    "array.prototype.findlast": "npm:@socketregistry/array.prototype.findlast@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/array.prototype.findlast
```

## Requirements

Node >= `18.20.4`
