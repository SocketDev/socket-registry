# <%= it.name %>

[![Socket Badge](https://socket.dev/api/badge/npm/package/<%= it.name %>)](https://socket.dev/npm/package/<%= it.name %>)
[![CI - <%= it.name %>](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

>A <%~ it.adjectivesText %>
<% if (Object.keys(it.dependencies).length) { %> low <% } else { %> zero <% } %>
dependency <% if (it.interop?.includes('esm')) { %> CJS/ESM compatible <% } %>
drop-in replacement of <% if (it.deprecated) { %> the deprecated <% } %>[`<%= it.originalName %>`](https://socket.dev/npm/package/<%= it.originalName %>)<% if (it.deprecated) { %> package <% } %> complete with TypeScript types.

<% if (it.categories.includes('levelup')) { %>
### Enhancements

  - TODO: List enhancements
<% } %>

## Installation

### Install as a package override

[`socket`](https://socket.dev/npm/package/socket)
CLI will automagically :sparkles: populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx socket optimize
```

Prefer to do it yourself? Add `<%= it.name %>`
to your `package.json`.

```json
{
  "overrides": {
    "<%= it.originalName %>": "npm:<%= it.name %>@^<%= it.version.major %>"
  },
  "resolutions": {
    "<%= it.originalName %>": "npm:<%= it.name %>@^<%= it.version.major %>"
  }
}
```

### Install as a plain dependency

Install with your favorite package manager.

```sh
npm install <%= it.name %>

```

## Requirements

Node <%~ it.engines.node.replace(/\d.+/, ' `$&`') %>
