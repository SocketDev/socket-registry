# @socketregistry/es-define-property

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/es-define-property)](https://socket.dev/npm/package/@socketregistry/es-define-property)
[![CI - socket-registry-js](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/ci.yml
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`es-define-property`](https://www.npmjs.com/package/es-define-property).

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
`@socketregistry/es-define-property` to your `package.json`.

```json
{
  "overrides": {
    "es-define-property": "npm:@socketregistry/es-define-property@^1"
  },
  "resolutions": {
    "es-define-property": "npm:@socketregistry/es-define-property@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/es-define-property
```

## Requirements

Node &gt;=18.20.4