# @socketregistry/has-proto

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/has-proto)](https://socket.dev/npm/package/@socketregistry/has-proto)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`has-proto`](https://www.npmjs.com/package/has-proto).

## Installation

### Install as Package Override

[`@socketsecurity/cli`](https://www.npmjs.com/package/@socketsecurity/cli) will
automagically populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

Prefer to do it yourself? You may manually add `@socketregistry/has-proto` to
your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/has-proto": "npm:@socketregistry/has-proto@^1"
  },
  "resolutions": {
    "@socketregistry/has-proto": "npm:@socketregistry/has-proto@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/has-proto
```

## Requirements

Node &gt;=18.20.4
