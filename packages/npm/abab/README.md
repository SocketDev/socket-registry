# @socketregistry/abab

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/abab)](https://socket.dev/npm/package/@socketregistry/abab)
[![CI - @socketregistry/abab](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of the deprecated
> [`abab`](https://socket.dev/npm/package/abab) package complete with TypeScript
> types.

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

Prefer to do it yourself? Add `@socketregistry/abab` to your `package.json`.

```json
{
  "overrides": {
    "abab": "npm:@socketregistry/abab@^1"
  },
  "resolutions": {
    "abab": "npm:@socketregistry/abab@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/abab
```

## Requirements

Node >= `18.20.4`
