# @socketregistry/is-number-object

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-number-object)](https://socket.dev/npm/package/@socketregistry/is-number-object)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`is-number-object`](https://www.npmjs.com/package/is-number-object).

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
`@socketregistry/is-number-object` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/is-number-object": "npm:@socketregistry/is-number-object@^1"
  },
  "resolutions": {
    "@socketregistry/is-number-object": "npm:@socketregistry/is-number-object@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-number-object
```

## Requirements

Node &gt;=18.20.4
