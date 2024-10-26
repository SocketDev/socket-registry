# @socketregistry/string.prototype.replaceall

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/string.prototype.replaceall)](https://socket.dev/npm/package/@socketregistry/string.prototype.replaceall)
[![CI - @socketregistry/string.prototype.replaceall](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`string.prototype.replaceall`](https://socket.dev/npm/package/string.prototype.replaceall)
> complete with TypeScript types.

## Installation

### Install as a package override

[`socket`](https://socket.dev/npm/package/socket) CLI will automagically
:sparkles: populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx socket optimize
```

Prefer to do it yourself? Add `@socketregistry/string.prototype.replaceall` to
your `package.json`.

```json
{
  "overrides": {
    "string.prototype.replaceall": "npm:@socketregistry/string.prototype.replaceall@^1"
  },
  "resolutions": {
    "string.prototype.replaceall": "npm:@socketregistry/string.prototype.replaceall@^1"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install @socketregistry/string.prototype.replaceall
```

## Requirements

Node >= `18.20.4`
