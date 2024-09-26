# @socketregistry/@socketregistry/number-is-nan

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/number-is-nan)](https://socket.dev/npm/package/@socketregistry/@socketregistry/number-is-nan)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`@socketregistry/number-is-nan`](https://www.npmjs.com/package/@socketregistry/number-is-nan).

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
`@socketregistry/@socketregistry/number-is-nan` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/number-is-nan": "npm:@socketregistry/@socketregistry/number-is-nan@^1"
  },
  "resolutions": {
    "@socketregistry/number-is-nan": "npm:@socketregistry/@socketregistry/number-is-nan@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/number-is-nan
```

## Requirements

Node &gt;=18.20.4
