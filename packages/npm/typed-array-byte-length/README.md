# @socketregistry/@socketregistry/typed-array-byte-length

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/typed-array-byte-length)](https://socket.dev/npm/package/@socketregistry/@socketregistry/typed-array-byte-length)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`@socketregistry/typed-array-byte-length`](https://www.npmjs.com/package/@socketregistry/typed-array-byte-length).

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
`@socketregistry/@socketregistry/typed-array-byte-length` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/typed-array-byte-length": "npm:@socketregistry/@socketregistry/typed-array-byte-length@^1"
  },
  "resolutions": {
    "@socketregistry/typed-array-byte-length": "npm:@socketregistry/@socketregistry/typed-array-byte-length@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/typed-array-byte-length
```

## Requirements

Node &gt;=18.20.4
