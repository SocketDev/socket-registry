# @socketregistry/string.prototype.trimstart

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/string.prototype.trimstart)](https://socket.dev/npm/package/@socketregistry/string.prototype.trimstart)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`string.prototype.trimstart`](https://www.npmjs.com/package/string.prototype.trimstart).

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
`@socketregistry/string.prototype.trimstart` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/string.prototype.trimstart": "npm:@socketregistry/string.prototype.trimstart@^1"
  },
  "resolutions": {
    "@socketregistry/string.prototype.trimstart": "npm:@socketregistry/string.prototype.trimstart@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/string.prototype.trimstart
```

## Requirements

Node &gt;=18.20.4
