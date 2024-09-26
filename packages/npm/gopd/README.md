# @socketregistry/@socketregistry/gopd

> A zero dependency drop-in replacement of
> [@socketregistry/gopd](https://www.npmjs.com/package/@socketregistry/gopd).

## Install

### Override

#### `@socketsecurity/cli` :sparkles:

Use [`@socketsecurity/cli`](https://www.npmjs.com/package/@socketsecurity/cli)
to automagically populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

#### Handcrafted

Manually add `@socketregistry/@socketregistry/gopd` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/gopd": "npm:@socketregistry/@socketregistry/gopd@^1"
  },
  "resolutions": {
    "@socketregistry/gopd": "npm:@socketregistry/@socketregistry/gopd@^1"
  }
}
```

### Plain Dependency

Install with your preferred package manager.

````sh
npm install @socketregistry/@socketregistry/gopd```

## Requirements

Node &gt;=18.20.4
````
