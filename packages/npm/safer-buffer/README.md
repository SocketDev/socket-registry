# @socketregistry/@socketregistry/safer-buffer

> A zero dependency drop-in replacement of
> [@socketregistry/safer-buffer](https://www.npmjs.com/package/@socketregistry/safer-buffer).

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

Manually add `@socketregistry/@socketregistry/safer-buffer` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/safer-buffer": "npm:@socketregistry/@socketregistry/safer-buffer@^1"
  },
  "resolutions": {
    "@socketregistry/safer-buffer": "npm:@socketregistry/@socketregistry/safer-buffer@^1"
  }
}
```

### Plain Dependency

Install with your preferred package manager.

````sh
npm install @socketregistry/@socketregistry/safer-buffer```

## Requirements

Node &gt;=18.20.4
````
