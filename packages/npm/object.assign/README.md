# @socketregistry/@socketregistry/object.assign

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/object.assign)](https://socket.dev/npm/package/@socketregistry/@socketregistry/object.assign)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`@socketregistry/object.assign`](https://www.npmjs.com/package/@socketregistry/object.assign).

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
`@socketregistry/@socketregistry/object.assign` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/object.assign": "npm:@socketregistry/@socketregistry/object.assign@^1"
  },
  "resolutions": {
    "@socketregistry/object.assign": "npm:@socketregistry/@socketregistry/object.assign@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/object.assign
```

## Requirements

Node &gt;=18.20.4
