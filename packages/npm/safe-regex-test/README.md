# @socketregistry/safe-regex-test

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/safe-regex-test)](https://socket.dev/npm/package/@socketregistry/safe-regex-test)
[![CI - @socketregistry/safe-regex-test](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`safe-regex-test`](https://www.npmjs.com/package/safe-regex-test).

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

Prefer to do it yourself? You may manually add `@socketregistry/safe-regex-test`
to your `package.json`.

```json
{
  "overrides": {
    "safe-regex-test": "npm:@socketregistry/safe-regex-test@^1"
  },
  "resolutions": {
    "safe-regex-test": "npm:@socketregistry/safe-regex-test@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/safe-regex-test
```

## Requirements

Node &gt;=18.20.4
