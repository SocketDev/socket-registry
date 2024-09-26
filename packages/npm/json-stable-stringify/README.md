# @socketregistry/json-stable-stringify

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/json-stable-stringify)](https://socket.dev/npm/package/@socketregistry/json-stable-stringify)
[![CI - socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A faster zero dependency drop-in replacement of
> [`json-stable-stringify`](https://www.npmjs.com/package/json-stable-stringify).

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
`@socketregistry/json-stable-stringify` to your `package.json`.

```json
{
  "overrides": {
    "json-stable-stringify": "npm:@socketregistry/json-stable-stringify@^1"
  },
  "resolutions": {
    "json-stable-stringify": "npm:@socketregistry/json-stable-stringify@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/json-stable-stringify
```

## Requirements

Node &gt;=18.20.4