# @socketregistry/@socketregistry/abab

> A zero dependency drop-in replacement of
> [@socketregistry/abab](https://www.npmjs.com/package/@socketregistry/abab).

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

Manually add `@socketregistry/@socketregistry/abab` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/abab": "npm:@socketregistry/@socketregistry/abab@^1"
  },
  "resolutions": {
    "@socketregistry/abab": "npm:@socketregistry/@socketregistry/abab@^1"
  }
}
```

### Plain Dependency

Install with your preferred package manager.

````sh
npm install @socketregistry/@socketregistry/abab```

## Requirements

Node &gt;=18.20.4
````
