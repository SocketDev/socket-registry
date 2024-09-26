# @socketregistry/array.prototype.at

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.prototype.at)](https://socket.dev/npm/package/@socketregistry/array.prototype.at)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`array.prototype.at`](https://www.npmjs.com/package/array.prototype.at).

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
`@socketregistry/array.prototype.at` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/array.prototype.at": "npm:@socketregistry/array.prototype.at@^1"
  },
  "resolutions": {
    "@socketregistry/array.prototype.at": "npm:@socketregistry/array.prototype.at@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/array.prototype.at
```

## Requirements

Node &gt;=18.20.4
