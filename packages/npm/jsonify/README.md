# @socketregistry/jsonify

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/jsonify)](https://socket.dev/npm/package/@socketregistry/jsonify)
[![CI - socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`jsonify`](https://www.npmjs.com/package/jsonify).

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

Prefer to do it yourself? You may manually add `@socketregistry/jsonify` to your
`package.json`.

```json
{
  "overrides": {
    "jsonify": "npm:@socketregistry/jsonify@^1"
  },
  "resolutions": {
    "jsonify": "npm:@socketregistry/jsonify@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/jsonify
```

## Requirements

Node &gt;=18.20.4
