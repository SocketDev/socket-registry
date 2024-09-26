# @socketregistry/arraybuffer.prototype.slice

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/arraybuffer.prototype.slice)](https://socket.dev/npm/package/@socketregistry/arraybuffer.prototype.slice)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`arraybuffer.prototype.slice`](https://www.npmjs.com/package/arraybuffer.prototype.slice).

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
`@socketregistry/arraybuffer.prototype.slice` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/arraybuffer.prototype.slice": "npm:@socketregistry/arraybuffer.prototype.slice@^1"
  },
  "resolutions": {
    "@socketregistry/arraybuffer.prototype.slice": "npm:@socketregistry/arraybuffer.prototype.slice@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/arraybuffer.prototype.slice
```

## Requirements

Node &gt;=18.20.4
