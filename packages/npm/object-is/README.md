# @socketregistry/@socketregistry/object-is

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/object-is)](https://socket.dev/npm/package/@socketregistry/@socketregistry/object-is)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`@socketregistry/object-is`](https://www.npmjs.com/package/@socketregistry/object-is).

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
`@socketregistry/@socketregistry/object-is` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/object-is": "npm:@socketregistry/@socketregistry/object-is@^1"
  },
  "resolutions": {
    "@socketregistry/object-is": "npm:@socketregistry/@socketregistry/object-is@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/object-is
```

## Requirements

Node &gt;=18.20.4
