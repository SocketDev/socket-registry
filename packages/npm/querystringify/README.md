# @socketregistry/@socketregistry/querystringify

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/querystringify)](https://socket.dev/npm/package/@socketregistry/@socketregistry/querystringify)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`@socketregistry/querystringify`](https://www.npmjs.com/package/@socketregistry/querystringify).

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
`@socketregistry/@socketregistry/querystringify` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/querystringify": "npm:@socketregistry/@socketregistry/querystringify@^1"
  },
  "resolutions": {
    "@socketregistry/querystringify": "npm:@socketregistry/@socketregistry/querystringify@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/querystringify
```

## Requirements

Node &gt;=18.20.4
