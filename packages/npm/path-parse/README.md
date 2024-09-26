# @socketregistry/@socketregistry/path-parse

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/path-parse)](https://socket.dev/npm/package/@socketregistry/@socketregistry/path-parse)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`@socketregistry/path-parse`](https://www.npmjs.com/package/@socketregistry/path-parse).

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
`@socketregistry/@socketregistry/path-parse` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/path-parse": "npm:@socketregistry/@socketregistry/path-parse@^1"
  },
  "resolutions": {
    "@socketregistry/path-parse": "npm:@socketregistry/@socketregistry/path-parse@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/path-parse
```

## Requirements

Node &gt;=18.20.4
