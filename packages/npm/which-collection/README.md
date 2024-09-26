# @socketregistry/@socketregistry/which-collection

> A zero dependency drop-in replacement of
> [@socketregistry/which-collection](https://www.npmjs.com/package/@socketregistry/which-collection).

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

Manually add `@socketregistry/@socketregistry/which-collection` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/which-collection": "npm:@socketregistry/@socketregistry/which-collection@^1"
  },
  "resolutions": {
    "@socketregistry/which-collection": "npm:@socketregistry/@socketregistry/which-collection@^1"
  }
}
```

### Plain Dependency

Install with your preferred package manager.

````sh
npm install @socketregistry/@socketregistry/which-collection```

## Requirements

Node &gt;=18.20.4
````
