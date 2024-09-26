# @socketregistry/is-boolean-object

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-boolean-object)](https://socket.dev/npm/package/@socketregistry/is-boolean-object)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`is-boolean-object`](https://www.npmjs.com/package/is-boolean-object).

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

Prefer to do it yourself? You may manually add
`@socketregistry/is-boolean-object` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/is-boolean-object": "npm:@socketregistry/is-boolean-object@^1"
  },
  "resolutions": {
    "@socketregistry/is-boolean-object": "npm:@socketregistry/is-boolean-object@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-boolean-object
```

## Requirements

Node &gt;=18.20.4
