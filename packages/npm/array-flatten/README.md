# @socketregistry/array-flatten

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/array-flatten)](https://socket.dev/npm/package/@socketregistry/array-flatten)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`array-flatten`](https://www.npmjs.com/package/array-flatten).

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

Prefer to do it yourself? You may manually add `@socketregistry/array-flatten`
to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/array-flatten": "npm:@socketregistry/array-flatten@^1"
  },
  "resolutions": {
    "@socketregistry/array-flatten": "npm:@socketregistry/array-flatten@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/array-flatten
```

## Requirements

Node &gt;=18.20.4
