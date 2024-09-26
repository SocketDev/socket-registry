# @socketregistry/is-negative-zero

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-negative-zero)](https://socket.dev/npm/package/@socketregistry/is-negative-zero)
[![CI - @socketregistry/is-negative-zero](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`is-negative-zero`](https://www.npmjs.com/package/is-negative-zero).

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
`@socketregistry/is-negative-zero` to your `package.json`.

```json
{
  "overrides": {
    "is-negative-zero": "npm:@socketregistry/is-negative-zero@^1"
  },
  "resolutions": {
    "is-negative-zero": "npm:@socketregistry/is-negative-zero@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-negative-zero
```

## Requirements

Node &gt;= `18.20.4`
