# @socketregistry/@socketregistry/iterator.prototype

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/iterator.prototype)](https://socket.dev/npm/package/@socketregistry/@socketregistry/iterator.prototype)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`@socketregistry/iterator.prototype`](https://www.npmjs.com/package/@socketregistry/iterator.prototype).

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
`@socketregistry/@socketregistry/iterator.prototype` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/iterator.prototype": "npm:@socketregistry/@socketregistry/iterator.prototype@^1"
  },
  "resolutions": {
    "@socketregistry/iterator.prototype": "npm:@socketregistry/@socketregistry/iterator.prototype@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/iterator.prototype
```

## Requirements

Node &gt;=18.20.4
