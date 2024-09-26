# @socketregistry/@socketregistry/define-properties

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/define-properties)](https://socket.dev/npm/package/@socketregistry/@socketregistry/define-properties)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [@socketregistry/define-properties](https://www.npmjs.com/package/@socketregistry/define-properties).

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

Manually add `@socketregistry/@socketregistry/define-properties` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/define-properties": "npm:@socketregistry/@socketregistry/define-properties@^1"
  },
  "resolutions": {
    "@socketregistry/define-properties": "npm:@socketregistry/@socketregistry/define-properties@^1"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/define-properties
```

## Requirements

Node &gt;=18.20.4
