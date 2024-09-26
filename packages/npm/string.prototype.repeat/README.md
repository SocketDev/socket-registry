# @socketregistry/string.prototype.repeat

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/string.prototype.repeat)](https://socket.dev/npm/package/@socketregistry/string.prototype.repeat)
[![CI - @socketregistry/string.prototype.repeat](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`string.prototype.repeat`](https://www.npmjs.com/package/string.prototype.repeat).

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
`@socketregistry/string.prototype.repeat` to your `package.json`.

```json
{
  "overrides": {
    "string.prototype.repeat": "npm:@socketregistry/string.prototype.repeat@^1"
  },
  "resolutions": {
    "string.prototype.repeat": "npm:@socketregistry/string.prototype.repeat@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/string.prototype.repeat
```

## Requirements

Node >= `18.20.4`
