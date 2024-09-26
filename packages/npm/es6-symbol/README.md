# @socketregistry/@socketregistry/es6-symbol

> A zero dependency drop-in replacement of
> [@socketregistry/es6-symbol](https://www.npmjs.com/package/@socketregistry/es6-symbol).

## Install

### As A Package Override

#### Using `@socketsecurity/cli` :sparkles:

Use [`@socketsecurity/cli`](https://www.npmjs.com/package/@socketsecurity/cli)
to automagically populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

#### Using Handcrafted Artisanal Edits

Manually add `@socketregistry/@socketregistry/es6-symbol` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/es6-symbol": "npm:@socketregistry/@socketregistry/es6-symbol@^1"
  },
  "resolutions": {
    "@socketregistry/es6-symbol": "npm:@socketregistry/@socketregistry/es6-symbol@^1"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/es6-symbol
```

## Requirements

Node &gt;=18.20.4
