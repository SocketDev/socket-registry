# @socketregistry/get-symbol-description

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/get-symbol-description)](https://socket.dev/npm/package/@socketregistry/get-symbol-description)
[![CI - socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`get-symbol-description`](https://www.npmjs.com/package/get-symbol-description).

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
`@socketregistry/get-symbol-description` to your `package.json`.

```json
{
  "overrides": {
    "get-symbol-description": "npm:@socketregistry/get-symbol-description@^1"
  },
  "resolutions": {
    "get-symbol-description": "npm:@socketregistry/get-symbol-description@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/get-symbol-description
```

## Requirements

Node &gt;=18.20.4