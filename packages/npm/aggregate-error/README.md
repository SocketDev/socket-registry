# @socketregistry/aggregate-error

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/aggregate-error)](https://socket.dev/npm/package/@socketregistry/aggregate-error)
[![CI - @socketregistry/aggregate-error](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency CJS/ESM compatible drop-in replacement of
> [`aggregate-error`](https://socket.dev/npm/package/aggregate-error) complete
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

Prefer to do it yourself? You may manually add `@socketregistry/aggregate-error`
to your `package.json`.

```json
{
  "overrides": {
    "aggregate-error": "npm:@socketregistry/aggregate-error@^1"
  },
  "resolutions": {
    "aggregate-error": "npm:@socketregistry/aggregate-error@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/aggregate-error
```

## Requirements

Node >= `18.20.4`
