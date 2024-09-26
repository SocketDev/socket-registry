# <%= it.name %>

[![Socket Badge](https://socket.dev/api/badge/npm/package/<%= it.name %>)](https://socket.dev/npm/package/<%= it.name %>)
[![CI - <%= it.name %>](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml/badge.svg)](https://github.com/SocketDev/socket-registry-js/actions/workflows/test.yml)
[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)

>A<% if (it.socket.categories.includes('speedup')) { %> faster <% } %>
<% if (it.socket.categories.includes('tightenup')) { %> more secure <% } %>
<% if (Object.keys(it.dependencies ?? {}).length) { %> low <% } else { %> zero <% } %>
dependency <% if (it.socket.interop?.includes('esm')) { %> CommonJS compatible <% } %>
drop-in replacement of <% if (it.manifest.deprecated) { %> the deprecated <% } %>[`<%= it.originalName %>`](https://www.npmjs.com/package/<%= it.originalName %>)<% if (it.manifest.deprecated) { %> package <% } %>.

## Installation

### Install as a package override

[`@socketsecurity/cli`](https://www.npmjs.com/package/@socketsecurity/cli)
will automagically :sparkles: populate the
[overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
and [resolutions](https://yarnpkg.com/configuration/manifest#resolutions) fields
of your `package.json`.

```sh
npx @socketsecurity/cli optimize
```

Prefer to do it yourself? You may manually add `<%= it.name %>`
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

Install with your preferred package manager.

```sh
npm install <%= it.name %>

```

## Requirements

Node <%~ it.engines.node.replace(/\d.+/, ' `$&`') %>
