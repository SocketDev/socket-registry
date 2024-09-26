# @socketregistry/typedarray.prototype.slice

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/typedarray.prototype.slice)](https://socket.dev/npm/package/@socketregistry/typedarray.prototype.slice)
[![CI - @socketregistry/typedarray.prototype.slice](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`typedarray.prototype.slice`](https://www.npmjs.com/package/typedarray.prototype.slice).

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
`@socketregistry/typedarray.prototype.slice` to your `package.json`.

```json
{
  "overrides": {
    "typedarray.prototype.slice": "npm:@socketregistry/typedarray.prototype.slice@^1"
  },
  "resolutions": {
    "typedarray.prototype.slice": "npm:@socketregistry/typedarray.prototype.slice@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/typedarray.prototype.slice
```

## Requirements

Node >= `18.20.4`
