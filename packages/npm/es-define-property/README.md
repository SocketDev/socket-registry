# @socketregistry/@socketregistry/es-define-property

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketregistry/@socketregistry/es-define-property)](https://socket.dev/npm/package/@socketregistry/@socketregistry/es-define-property)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

> A zero dependency drop-in replacement of
> [`@socketregistry/es-define-property`](https://www.npmjs.com/package/@socketregistry/es-define-property).

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
`@socketregistry/@socketregistry/es-define-property` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/es-define-property": "npm:@socketregistry/@socketregistry/es-define-property@^1"
  },
  "resolutions": {
    "@socketregistry/es-define-property": "npm:@socketregistry/@socketregistry/es-define-property@^1"
  }
}
```

### Install as Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/es-define-property
```

## Requirements

Node &gt;=18.20.4
