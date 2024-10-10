# @socketregistry/arraybuffer.prototype.slice

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/arraybuffer.prototype.slice)](https://socket.dev/npm/package/@socketregistry/arraybuffer.prototype.slice)
[![CI - @socketregistry/arraybuffer.prototype.slice](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`arraybuffer.prototype.slice`](https://www.npmjs.com/package/arraybuffer.prototype.slice)
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
`@socketregistry/arraybuffer.prototype.slice` to your `package.json`.

```json
{
  "overrides": {
    "arraybuffer.prototype.slice": "npm:@socketregistry/arraybuffer.prototype.slice@^1"
  },
  "resolutions": {
    "arraybuffer.prototype.slice": "npm:@socketregistry/arraybuffer.prototype.slice@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/arraybuffer.prototype.slice
```

## Requirements

Node >= `18.20.4`
