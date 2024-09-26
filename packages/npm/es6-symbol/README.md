# @socketregistry/es6-symbol

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/es6-symbol)](https://socket.dev/npm/package/@socketregistry/es6-symbol)
[![CI - @socketregistry/es6-symbol](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`es6-symbol`](https://www.npmjs.com/package/es6-symbol).

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

Prefer to do it yourself? You may manually add `@socketregistry/es6-symbol` to
your `package.json`.

```json
{
  "overrides": {
    "es6-symbol": "npm:@socketregistry/es6-symbol@^1"
  },
  "resolutions": {
    "es6-symbol": "npm:@socketregistry/es6-symbol@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/es6-symbol
```

## Requirements

Node &gt;=18.20.4
