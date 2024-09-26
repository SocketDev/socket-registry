# @socketregistry/@socketregistry/object-keys

> A zero dependency drop-in replacement of
> [@socketregistry/object-keys](https://www.npmjs.com/package/@socketregistry/object-keys).

## Install

### `@socketsecurity/cli` :sparkles:

Use [`@socketsecurity/cli`](https://www.npmjs.com/package/@socketsecurity/cli)
to automagically populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

### Handcrafted

Manually add `@socketregistry/@socketregistry/object-keys` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/object-keys": "npm:@socketregistry/@socketregistry/object-keys@^1"
  },
  "resolutions": {
    "@socketregistry/object-keys": "npm:@socketregistry/@socketregistry/object-keys@^1"
  }
}
```

### Direct Dependency

Install as a direct dependency.

````sh
npm install @socketregistry/@socketregistry/object-keys```

## Requirements

Node &gt;=18.20.4
````
