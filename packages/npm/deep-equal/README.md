# @socketregistry/deep-equal

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/deep-equal)](https://socket.dev/npm/package/@socketregistry/deep-equal)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A low dependency drop-in replacement of
> [`deep-equal`](https://www.npmjs.com/package/deep-equal).

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

Prefer to do it yourself? You may manually add `@socketregistry/deep-equal` to
your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/deep-equal": "npm:@socketregistry/deep-equal@^1"
  },
  "resolutions": {
    "@socketregistry/deep-equal": "npm:@socketregistry/deep-equal@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/deep-equal
```

## Requirements

Node &gt;=18.20.4
