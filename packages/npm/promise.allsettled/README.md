# @socketregistry/promise.allsettled

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/promise.allsettled)](https://socket.dev/npm/package/@socketregistry/promise.allsettled)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`promise.allsettled`](https://www.npmjs.com/package/promise.allsettled).

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
`@socketregistry/promise.allsettled` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/promise.allsettled": "npm:@socketregistry/promise.allsettled@^1"
  },
  "resolutions": {
    "@socketregistry/promise.allsettled": "npm:@socketregistry/promise.allsettled@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/promise.allsettled
```

## Requirements

Node &gt;=18.20.4
