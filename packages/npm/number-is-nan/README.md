# @socketregistry/number-is-nan

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/number-is-nan)](https://socket.dev/npm/package/@socketregistry/number-is-nan)
[![CI - @socketregistry/number-is-nan](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`number-is-nan`](https://socket.dev/npm/package/number-is-nan) complete with
> TypeScript types.

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

Prefer to do it yourself? Add `@socketregistry/number-is-nan` to your
`package.json`.

```json
{
  "overrides": {
    "number-is-nan": "npm:@socketregistry/number-is-nan@^1"
  },
  "resolutions": {
    "number-is-nan": "npm:@socketregistry/number-is-nan@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/number-is-nan
```

## Requirements

Node >= `18.20.4`
