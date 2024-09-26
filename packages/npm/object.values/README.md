# @socketregistry/@socketregistry/object.values

> A zero dependency drop-in replacement of
> [@socketregistry/object.values](https://www.npmjs.com/package/@socketregistry/object.values).

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

Manually add `@socketregistry/@socketregistry/object.values` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/object.values": "npm:@socketregistry/@socketregistry/object.values@^1"
  },
  "resolutions": {
    "@socketregistry/object.values": "npm:@socketregistry/@socketregistry/object.values@^1"
  }
}
```

### Plain Dependency

Install with your preferred package manager.

````sh
npm install @socketregistry/@socketregistry/object.values```

## Requirements

Node &gt;=18.20.4
````
