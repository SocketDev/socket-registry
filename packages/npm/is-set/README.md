# @socketregistry/@socketregistry/is-set

> A zero dependency drop-in replacement of
> [@socketregistry/is-set](https://www.npmjs.com/package/@socketregistry/is-set).

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

Manually add `@socketregistry/@socketregistry/is-set` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/is-set": "npm:@socketregistry/@socketregistry/is-set@^1"
  },
  "resolutions": {
    "@socketregistry/is-set": "npm:@socketregistry/@socketregistry/is-set@^1"
  }
}
```

### Plain Dependency

Install with your preferred package manager.

````sh
npm install @socketregistry/@socketregistry/is-set```

## Requirements

Node &gt;=18.20.4
````
