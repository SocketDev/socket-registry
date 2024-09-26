# @socketregistry/string.prototype.trim

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/string.prototype.trim)](https://socket.dev/npm/package/@socketregistry/string.prototype.trim)
[![CI - socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`string.prototype.trim`](https://www.npmjs.com/package/string.prototype.trim).

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
`@socketregistry/string.prototype.trim` to your `package.json`.

```json
{
  "overrides": {
    "string.prototype.trim": "npm:@socketregistry/string.prototype.trim@^1"
  },
  "resolutions": {
    "string.prototype.trim": "npm:@socketregistry/string.prototype.trim@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/string.prototype.trim
```

## Requirements

Node &gt;=18.20.4
