# @socketregistry/date

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/date)](https://socket.dev/npm/package/@socketregistry/date)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`date`](https://www.npmjs.com/package/date).

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

Prefer to do it yourself? You may manually add `@socketregistry/date` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/date": "npm:@socketregistry/date@^1"
  },
  "resolutions": {
    "@socketregistry/date": "npm:@socketregistry/date@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/date
```

## Requirements

Node &gt;=18.20.4
