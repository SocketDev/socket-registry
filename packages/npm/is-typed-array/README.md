# @socketregistry/is-typed-array

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-typed-array)](https://socket.dev/npm/package/@socketregistry/is-typed-array)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`is-typed-array`](https://www.npmjs.com/package/is-typed-array).

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

Prefer to do it yourself? You may manually add `@socketregistry/is-typed-array`
to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/is-typed-array": "npm:@socketregistry/is-typed-array@^1"
  },
  "resolutions": {
    "@socketregistry/is-typed-array": "npm:@socketregistry/is-typed-array@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-typed-array
```

## Requirements

Node &gt;=18.20.4
