# @socketregistry/string.prototype.trimright

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/string.prototype.trimright)](https://socket.dev/npm/package/@socketregistry/string.prototype.trimright)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`string.prototype.trimright`](https://www.npmjs.com/package/string.prototype.trimright).

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
`@socketregistry/string.prototype.trimright` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/string.prototype.trimright": "npm:@socketregistry/string.prototype.trimright@^1"
  },
  "resolutions": {
    "@socketregistry/string.prototype.trimright": "npm:@socketregistry/string.prototype.trimright@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/string.prototype.trimright
```

## Requirements

Node &gt;=18.20.4
