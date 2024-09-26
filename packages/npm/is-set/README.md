# @socketregistry/is-set

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-set)](https://socket.dev/npm/package/@socketregistry/is-set)
[![CI - @socketregistry/is-set](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`is-set`](https://www.npmjs.com/package/is-set).

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

Prefer to do it yourself? You may manually add `@socketregistry/is-set` to your
`package.json`.

```json
{
  "overrides": {
    "is-set": "npm:@socketregistry/is-set@^1"
  },
  "resolutions": {
    "is-set": "npm:@socketregistry/is-set@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-set
```

## Requirements

Node &gt;=18.20.4
