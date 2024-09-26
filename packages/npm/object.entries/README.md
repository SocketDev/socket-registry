# @socketregistry/object.entries

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/object.entries)](https://socket.dev/npm/package/@socketregistry/object.entries)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`object.entries`](https://www.npmjs.com/package/object.entries).

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

Prefer to do it yourself? You may manually add `@socketregistry/object.entries`
to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/object.entries": "npm:@socketregistry/object.entries@^1"
  },
  "resolutions": {
    "@socketregistry/object.entries": "npm:@socketregistry/object.entries@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/object.entries
```

## Requirements

Node &gt;=18.20.4
