# @socketregistry/@socketregistry/assert

> A low dependency drop-in replacement of
> [@socketregistry/assert](https://www.npmjs.com/package/@socketregistry/assert).

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

Manually add `@socketregistry/@socketregistry/assert` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/assert": "npm:@socketregistry/@socketregistry/assert@^1"
  },
  "resolutions": {
    "@socketregistry/assert": "npm:@socketregistry/@socketregistry/assert@^1"
  }
}
```

### Direct Dependency

Install as a direct dependency.

````sh
npm install @socketregistry/@socketregistry/assert```

## Requirements

Node &gt;=18.20.4
````
