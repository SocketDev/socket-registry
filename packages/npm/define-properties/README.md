# @socketregistry/@socketregistry/define-properties

> A zero dependency drop-in replacement of
> [@socketregistry/define-properties](https://www.npmjs.com/package/@socketregistry/define-properties).

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

Manually add `@socketregistry/@socketregistry/define-properties` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/define-properties": "npm:@socketregistry/@socketregistry/define-properties@^1"
  },
  "resolutions": {
    "@socketregistry/define-properties": "npm:@socketregistry/@socketregistry/define-properties@^1"
  }
}
```

### Plain Dependency

Install with your preferred package manager.

````sh
npm install @socketregistry/@socketregistry/define-properties```

## Requirements

Node &gt;=18.20.4
````
