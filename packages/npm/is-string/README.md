# @socketregistry/is-string

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/is-string)](https://socket.dev/npm/package/@socketregistry/is-string)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`is-string`](https://www.npmjs.com/package/is-string).

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

Prefer to do it yourself? You may manually add `@socketregistry/is-string` to
your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/is-string": "npm:@socketregistry/is-string@^1"
  },
  "resolutions": {
    "@socketregistry/is-string": "npm:@socketregistry/is-string@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/is-string
```

## Requirements

Node &gt;=18.20.4
