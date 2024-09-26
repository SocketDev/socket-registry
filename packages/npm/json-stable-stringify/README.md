# @socketregistry/@socketregistry/json-stable-stringify

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/json-stable-stringify)](https://socket.dev/npm/package/@socketregistry/@socketregistry/json-stable-stringify)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A faster zero dependency drop-in replacement of
> [@socketregistry/json-stable-stringify](https://www.npmjs.com/package/@socketregistry/json-stable-stringify).

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

Manually add `@socketregistry/@socketregistry/json-stable-stringify` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/json-stable-stringify": "npm:@socketregistry/@socketregistry/json-stable-stringify@^1"
  },
  "resolutions": {
    "@socketregistry/json-stable-stringify": "npm:@socketregistry/@socketregistry/json-stable-stringify@^1"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/json-stable-stringify
```

## Requirements

Node &gt;=18.20.4
