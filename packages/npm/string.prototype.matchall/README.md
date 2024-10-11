# @socketregistry/string.prototype.matchall

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/string.prototype.matchall)](https://socket.dev/npm/package/@socketregistry/string.prototype.matchall)
[![CI - @socketregistry/string.prototype.matchall](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`string.prototype.matchall`](https://socket.dev/npm/package/string.prototype.matchall)
> complete with TypeScript types.

## Installation

### Install as a package override

[`@socketsecurity/cli`](https://socket.dev/npm/package/@socketsecurity/cli) will
automagically :sparkles: populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

Prefer to do it yourself? You may manually add
`@socketregistry/string.prototype.matchall` to your `package.json`.

```json
{
  "overrides": {
    "string.prototype.matchall": "npm:@socketregistry/string.prototype.matchall@^1"
  },
  "resolutions": {
    "string.prototype.matchall": "npm:@socketregistry/string.prototype.matchall@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/string.prototype.matchall
```

## Requirements

Node >= `18.20.4`
