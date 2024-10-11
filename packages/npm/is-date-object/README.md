# @socketregistry/is-date-object

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-date-object)](https://socket.dev/npm/package/@socketregistry/is-date-object)
[![CI - @socketregistry/is-date-object](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`is-date-object`](https://socket.dev/npm/package/is-date-object) complete
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

Prefer to do it yourself? You may manually add `@socketregistry/is-date-object`
to your `package.json`.

```json
{
  "overrides": {
    "is-date-object": "npm:@socketregistry/is-date-object@^1"
  },
  "resolutions": {
    "is-date-object": "npm:@socketregistry/is-date-object@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-date-object
```

## Requirements

Node >= `18.20.4`
