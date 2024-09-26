# @socketregistry/is-weakref

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-weakref)](https://socket.dev/npm/package/@socketregistry/is-weakref)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`is-weakref`](https://www.npmjs.com/package/is-weakref).

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

Prefer to do it yourself? You may manually add `@socketregistry/is-weakref` to
your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/is-weakref": "npm:@socketregistry/is-weakref@^1"
  },
  "resolutions": {
    "@socketregistry/is-weakref": "npm:@socketregistry/is-weakref@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-weakref
```

## Requirements

Node &gt;=18.20.4
