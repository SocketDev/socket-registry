# @socketregistry/which-collection

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/which-collection)](https://socket.dev/npm/package/@socketregistry/which-collection)
[![CI - @socketregistry/which-collection](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`which-collection`](https://socket.dev/npm/package/which-collection) complete
> with TypeScript types.

## Installation

### Install as a package override

[`@socketsecurity/cli`](https://socket.dev/npm/package/@socketsecurity/cli) will
automagically :sparkles: populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

Prefer to do it yourself? You may manually add
`@socketregistry/which-collection` to your `package.json`.

```json
{
  "overrides": {
    "which-collection": "npm:@socketregistry/which-collection@^1"
  },
  "resolutions": {
    "which-collection": "npm:@socketregistry/which-collection@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/which-collection
```

## Requirements

Node >= `18.20.4`
