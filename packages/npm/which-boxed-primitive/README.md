# @socketregistry/which-boxed-primitive

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/which-boxed-primitive)](https://socket.dev/npm/package/@socketregistry/which-boxed-primitive)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`which-boxed-primitive`](https://www.npmjs.com/package/which-boxed-primitive).

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
`@socketregistry/which-boxed-primitive` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/which-boxed-primitive": "npm:@socketregistry/which-boxed-primitive@^1"
  },
  "resolutions": {
    "@socketregistry/which-boxed-primitive": "npm:@socketregistry/which-boxed-primitive@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/which-boxed-primitive
```

## Requirements

Node &gt;=18.20.4
