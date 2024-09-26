# @socketregistry/array.prototype.every

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array.prototype.every)](https://socket.dev/npm/package/@socketregistry/array.prototype.every)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`array.prototype.every`](https://www.npmjs.com/package/array.prototype.every).

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
`@socketregistry/array.prototype.every` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/array.prototype.every": "npm:@socketregistry/array.prototype.every@^1"
  },
  "resolutions": {
    "@socketregistry/array.prototype.every": "npm:@socketregistry/array.prototype.every@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/array.prototype.every
```

## Requirements

Node &gt;=18.20.4
