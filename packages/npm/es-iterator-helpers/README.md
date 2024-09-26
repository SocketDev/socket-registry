# @socketregistry/es-iterator-helpers

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/es-iterator-helpers)](https://socket.dev/npm/package/@socketregistry/es-iterator-helpers)
[![CI - socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`es-iterator-helpers`](https://www.npmjs.com/package/es-iterator-helpers).

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
`@socketregistry/es-iterator-helpers` to your `package.json`.

```json
{
  "overrides": {
    "es-iterator-helpers": "npm:@socketregistry/es-iterator-helpers@^1"
  },
  "resolutions": {
    "es-iterator-helpers": "npm:@socketregistry/es-iterator-helpers@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/es-iterator-helpers
```

## Requirements

Node &gt;=22.8.0