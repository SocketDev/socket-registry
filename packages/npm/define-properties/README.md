# @socketregistry/define-properties

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/define-properties)](https://socket.dev/npm/package/@socketregistry/define-properties)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`define-properties`](https://www.npmjs.com/package/define-properties).

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
`@socketregistry/define-properties` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/define-properties": "npm:@socketregistry/define-properties@^1"
  },
  "resolutions": {
    "@socketregistry/define-properties": "npm:@socketregistry/define-properties@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/define-properties
```

## Requirements

Node &gt;=18.20.4
