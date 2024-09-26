# @socketregistry/es-set-tostringtag

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/es-set-tostringtag)](https://socket.dev/npm/package/@socketregistry/es-set-tostringtag)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`es-set-tostringtag`](https://www.npmjs.com/package/es-set-tostringtag).

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
`@socketregistry/es-set-tostringtag` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/es-set-tostringtag": "npm:@socketregistry/es-set-tostringtag@^1"
  },
  "resolutions": {
    "@socketregistry/es-set-tostringtag": "npm:@socketregistry/es-set-tostringtag@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/es-set-tostringtag
```

## Requirements

Node &gt;=18.20.4
