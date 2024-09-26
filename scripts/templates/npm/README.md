# @socketregistry/<%= it.name %>

>A<% if (it.socket.categories.includes('speedup')) { %> faster <% } %>
<% if (it.socket.categories.includes('tightenup')) { %> more secure <% } %>
<% if (Object.keys(it.dependencies ?? {}).length) { %> low <% } else { %> zero <% } %>
dependency <% if (it.socket.interop?.includes('esm')) { %>CommonJS compatible<% } %>
drop-in replacement of [<%= it.name %>](https://www.npmjs.com/package/<%= it.name %>).

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

Manually add `@socketregistry/<%= it.name %>` to your `package.json`.

```json
{
  "overrides": {
    "<%= it.name %>": "npm:@socketregistry/<%= it.name %>@^<%= it.version.major %>"
  },
  "resolutions": {
    "<%= it.name %>": "npm:@socketregistry/<%= it.name %>@^<%= it.version.major %>"
  }
}
```

### As A Plain Dependency

Install with your preferred package manager.

```sh
npm install @socketregistry/<%= it.name %>

```

## Requirements

Node <%= it.engines.node %>
