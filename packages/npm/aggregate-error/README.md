# @socketregistry/aggregate-error

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/aggregate-error)](https://socket.dev/npm/package/@socketregistry/aggregate-error)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`aggregate-error`](https://www.npmjs.com/package/aggregate-error).

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

Prefer to do it yourself? You may manually add `@socketregistry/aggregate-error`
to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/aggregate-error": "npm:@socketregistry/aggregate-error@^1"
  },
  "resolutions": {
    "@socketregistry/aggregate-error": "npm:@socketregistry/aggregate-error@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/aggregate-error
```

## Requirements

Node &gt;=18.20.4
