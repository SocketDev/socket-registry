# @socketregistry/json-stable-stringify

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/json-stable-stringify)](https://socket.dev/npm/package/@socketregistry/json-stable-stringify)
[![CI - @socketregistry/json-stable-stringify](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A fast, enhanced, and tested zero dependency drop-in replacement of
> [`json-stable-stringify`](https://socket.dev/npm/package/json-stable-stringify)
> complete with TypeScript types.

### Enhancements

- ♾️ No call stack limits
- 🆕 Supports
  [`JSON.rawJSON()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/rawJSON)

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
`@socketregistry/json-stable-stringify` to your `package.json`.

```json
{
  "overrides": {
    "json-stable-stringify": "npm:@socketregistry/json-stable-stringify@^1"
  },
  "resolutions": {
    "json-stable-stringify": "npm:@socketregistry/json-stable-stringify@^1"
  }
}
```

### Install as a plain dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/json-stable-stringify
```

## Requirements

Node >= `18.20.4`
