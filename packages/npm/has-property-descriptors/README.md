# @socketregistry/has-property-descriptors

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/has-property-descriptors)](https://socket.dev/npm/package/@socketregistry/has-property-descriptors)
[![CI - @socketregistry/has-property-descriptors](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`has-property-descriptors`](https://socket.dev/npm/package/has-property-descriptors)
> complete with TypeScript types.

## Installation

### Install as a package override

[`socket`](https://socket.dev/npm/package/socket) CLI will automagically ✨
populate
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) of
your `package.json`.

```sh
npx socket optimize
```

Prefer to do it yourself? Add `@socketregistry/has-property-descriptors` to your
`package.json`.

```json
{
  "overrides": {
    "has-property-descriptors": "npm:@socketregistry/has-property-descriptors@^1"
  },
  "resolutions": {
    "has-property-descriptors": "npm:@socketregistry/has-property-descriptors@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/has-property-descriptors
```

## Requirements

Node >= `18.20.4`
