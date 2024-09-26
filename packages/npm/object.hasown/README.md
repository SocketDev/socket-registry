# @socketregistry/@socketregistry/object.hasown

> A zero dependency drop-in replacement of
> [@socketregistry/object.hasown](https://www.npmjs.com/package/@socketregistry/object.hasown).

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

Manually add `@socketregistry/@socketregistry/object.hasown` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/object.hasown": "npm:@socketregistry/@socketregistry/object.hasown@^1"
  },
  "resolutions": {
    "@socketregistry/object.hasown": "npm:@socketregistry/@socketregistry/object.hasown@^1"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/object.hasown
```

## Requirements

Node &gt;=18.20.4
