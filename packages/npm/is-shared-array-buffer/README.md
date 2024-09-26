# @socketregistry/is-shared-array-buffer

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-shared-array-buffer)](https://socket.dev/npm/package/@socketregistry/is-shared-array-buffer)
[![CI - @socketregistry/is-shared-array-buffer](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`is-shared-array-buffer`](https://www.npmjs.com/package/is-shared-array-buffer).

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
`@socketregistry/is-shared-array-buffer` to your `package.json`.

```json
{
  "overrides": {
    "is-shared-array-buffer": "npm:@socketregistry/is-shared-array-buffer@^1"
  },
  "resolutions": {
    "is-shared-array-buffer": "npm:@socketregistry/is-shared-array-buffer@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-shared-array-buffer
```

## Requirements

Node >= `18.20.4`
