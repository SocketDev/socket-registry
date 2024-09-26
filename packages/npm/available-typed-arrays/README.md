# @socketregistry/available-typed-arrays

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/available-typed-arrays)](https://socket.dev/npm/package/@socketregistry/available-typed-arrays)
[![CI - socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`available-typed-arrays`](https://www.npmjs.com/package/available-typed-arrays).

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
`@socketregistry/available-typed-arrays` to your `package.json`.

```json
{
  "overrides": {
    "available-typed-arrays": "npm:@socketregistry/available-typed-arrays@^1"
  },
  "resolutions": {
    "available-typed-arrays": "npm:@socketregistry/available-typed-arrays@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/available-typed-arrays
```

## Requirements

Node &gt;=18.20.4