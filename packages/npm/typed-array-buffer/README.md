# @socketregistry/typed-array-buffer

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/typed-array-buffer)](https://socket.dev/npm/package/@socketregistry/typed-array-buffer)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`typed-array-buffer`](https://www.npmjs.com/package/typed-array-buffer).

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
`@socketregistry/typed-array-buffer` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/typed-array-buffer": "npm:@socketregistry/typed-array-buffer@^1"
  },
  "resolutions": {
    "@socketregistry/typed-array-buffer": "npm:@socketregistry/typed-array-buffer@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/typed-array-buffer
```

## Requirements

Node &gt;=18.20.4
