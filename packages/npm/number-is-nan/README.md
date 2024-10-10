# @socketregistry/number-is-nan

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/number-is-nan)](https://socket.dev/npm/package/@socketregistry/number-is-nan)
[![CI - @socketregistry/number-is-nan](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A tested zero dependency drop-in replacement of
> [`number-is-nan`](https://www.npmjs.com/package/number-is-nan) complete with
> TypeScript types.

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

Prefer to do it yourself? You may manually add `@socketregistry/number-is-nan`
to your `package.json`.

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

Install with your preferred package manager.

```sh
npm install @socketregistry/number-is-nan
```

## Requirements

Node >= `18.20.4`
