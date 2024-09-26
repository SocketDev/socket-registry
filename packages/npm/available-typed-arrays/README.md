# @socketregistry/@socketregistry/available-typed-arrays

> A zero dependency drop-in replacement of
> [@socketregistry/available-typed-arrays](https://www.npmjs.com/package/@socketregistry/available-typed-arrays).

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

Manually add `@socketregistry/@socketregistry/available-typed-arrays` to your
`package.json`.

```json
{
  "overrides": {
    "@socketregistry/available-typed-arrays": "npm:@socketregistry/@socketregistry/available-typed-arrays@^1"
  },
  "resolutions": {
    "@socketregistry/available-typed-arrays": "npm:@socketregistry/@socketregistry/available-typed-arrays@^1"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/@socketregistry/available-typed-arrays
```

## Requirements

Node &gt;=18.20.4
