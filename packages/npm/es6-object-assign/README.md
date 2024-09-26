# @socketregistry/es6-object-assign

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/es6-object-assign)](https://socket.dev/npm/package/@socketregistry/es6-object-assign)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`es6-object-assign`](https://www.npmjs.com/package/es6-object-assign).

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
`@socketregistry/es6-object-assign` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/es6-object-assign": "npm:@socketregistry/es6-object-assign@^1"
  },
  "resolutions": {
    "@socketregistry/es6-object-assign": "npm:@socketregistry/es6-object-assign@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/es6-object-assign
```

## Requirements

Node &gt;=18.20.4
