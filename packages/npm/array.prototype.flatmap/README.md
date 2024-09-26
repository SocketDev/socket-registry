# @socketregistry/array.prototype.flatmap

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.prototype.flatmap)](https://socket.dev/npm/package/@socketregistry/array.prototype.flatmap)
[![CI - @socketregistry/array.prototype.flatmap](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`array.prototype.flatmap`](https://www.npmjs.com/package/array.prototype.flatmap).

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
`@socketregistry/array.prototype.flatmap` to your `package.json`.

```json
{
  "overrides": {
    "array.prototype.flatmap": "npm:@socketregistry/array.prototype.flatmap@^1"
  },
  "resolutions": {
    "array.prototype.flatmap": "npm:@socketregistry/array.prototype.flatmap@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/array.prototype.flatmap
```

## Requirements

Node &gt;= `18.20.4`
