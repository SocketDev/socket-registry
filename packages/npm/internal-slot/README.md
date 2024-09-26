# @socketregistry/@socketregistry/internal-slot

> A zero dependency drop-in replacement of
> [@socketregistry/internal-slot](https://www.npmjs.com/package/@socketregistry/internal-slot).

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

Manually add `@socketregistry/@socketregistry/internal-slot` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/internal-slot": "npm:@socketregistry/@socketregistry/internal-slot@^1"
  },
  "resolutions": {
    "@socketregistry/internal-slot": "npm:@socketregistry/@socketregistry/internal-slot@^1"
  }
}
```

### Direct Dependency

Install as a direct dependency.

````sh
npm install @socketregistry/@socketregistry/internal-slot```

## Requirements

Node &gt;=18.20.4
````
