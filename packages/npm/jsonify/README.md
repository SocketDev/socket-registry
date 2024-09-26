# @socketregistry/@socketregistry/jsonify

> A zero dependency drop-in replacement of
> [@socketregistry/jsonify](https://www.npmjs.com/package/@socketregistry/jsonify).

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

Manually add `@socketregistry/@socketregistry/jsonify` to your `package.json`.

```json
{
  "overrides": {
    "@socketregistry/jsonify": "npm:@socketregistry/@socketregistry/jsonify@^1"
  },
  "resolutions": {
    "@socketregistry/jsonify": "npm:@socketregistry/@socketregistry/jsonify@^1"
  }
}
```

### Direct Dependency

Install as a direct dependency.

````sh
npm install @socketregistry/@socketregistry/jsonify```

## Requirements

Node &gt;=18.20.4
````
