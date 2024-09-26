# @socketregistry/@socketregistry/array-flatten

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/array-flatten)](https://socket.dev/npm/package/@socketregistry/@socketregistry/array-flatten)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [@socketregistry/array-flatten](https://www.npmjs.com/package/@socketregistry/array-flatten).

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

Manually add `@socketregistry/@socketregistry/array-flatten` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/array-flatten": "npm:@socketregistry/@socketregistry/array-flatten@^1"
  },
  "resolutions": {
    "@socketregistry/array-flatten": "npm:@socketregistry/@socketregistry/array-flatten@^1"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/array-flatten
```

## Requirements

Node &gt;=18.20.4
