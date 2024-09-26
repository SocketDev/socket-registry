# @socketregistry/@socketregistry/is-weakmap

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/is-weakmap)](https://socket.dev/npm/package/@socketregistry/@socketregistry/is-weakmap)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [@socketregistry/is-weakmap](https://www.npmjs.com/package/@socketregistry/is-weakmap).

## Install

### As A Package Override

#### Using `@socketsecurity/cli` :sparkles:

Use [`@socketsecurity/cli`](https://www.npmjs.com/package/@socketsecurity/cli)
to automagically populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

#### Using Handcrafted Artisanal Edits

Manually add `@socketregistry/@socketregistry/is-weakmap` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/is-weakmap": "npm:@socketregistry/@socketregistry/is-weakmap@^1"
  },
  "resolutions": {
    "@socketregistry/is-weakmap": "npm:@socketregistry/@socketregistry/is-weakmap@^1"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/is-weakmap
```

## Requirements

Node &gt;=18.20.4
