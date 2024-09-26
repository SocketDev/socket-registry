# @socketregistry/object.groupby

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/object.groupby)](https://socket.dev/npm/package/@socketregistry/object.groupby)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`object.groupby`](https://www.npmjs.com/package/object.groupby).

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

Prefer to do it yourself? You may manually add `@socketregistry/object.groupby`
to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/object.groupby": "npm:@socketregistry/object.groupby@^1"
  },
  "resolutions": {
    "@socketregistry/object.groupby": "npm:@socketregistry/object.groupby@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/object.groupby
```

## Requirements

Node &gt;=21.7.3
