# @socketregistry/@socketregistry/aggregate-error

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/aggregate-error)](https://socket.dev/npm/package/@socketregistry/@socketregistry/aggregate-error)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [@socketregistry/aggregate-error](https://www.npmjs.com/package/@socketregistry/aggregate-error).

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

Manually add `@socketregistry/@socketregistry/aggregate-error` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/aggregate-error": "npm:@socketregistry/@socketregistry/aggregate-error@^1"
  },
  "resolutions": {
    "@socketregistry/aggregate-error": "npm:@socketregistry/@socketregistry/aggregate-error@^1"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/aggregate-error
```

## Requirements

Node &gt;=18.20.4
