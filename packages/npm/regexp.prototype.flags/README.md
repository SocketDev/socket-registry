# @socketregistry/regexp.prototype.flags

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/regexp.prototype.flags)](https://socket.dev/npm/package/@socketregistry/regexp.prototype.flags)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`regexp.prototype.flags`](https://www.npmjs.com/package/regexp.prototype.flags).

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
`@socketregistry/regexp.prototype.flags` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/regexp.prototype.flags": "npm:@socketregistry/regexp.prototype.flags@^1"
  },
  "resolutions": {
    "@socketregistry/regexp.prototype.flags": "npm:@socketregistry/regexp.prototype.flags@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/regexp.prototype.flags
```

## Requirements

Node &gt;=18.20.4
