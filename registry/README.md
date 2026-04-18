# @socketsecurity/registry

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketsecurity/registry)](https://socket.dev/npm/package/@socketsecurity/registry)
[![CI](https://github.com/SocketDev/socket-registry/actions/workflows/_local-not-for-reuse-ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/_local-not-for-reuse-ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

Query Socket Registry manifest data.

## Install

```bash
pnpm install @socketsecurity/registry
```

## Usage

`getManifestData()` has three forms. Return type narrows based on arguments.

### Look up a single package

```typescript
import { getManifestData } from '@socketsecurity/registry'

const pkg = getManifestData('npm', 'deep-equal')
// ManifestEntryData | ManifestEntry | undefined
console.log(pkg?.name) // '@socketregistry/deep-equal'
console.log(pkg?.version) // current override version
console.log(pkg?.categories) // ['cleanup']
```

### List all overrides for an ecosystem

Returns the raw `[purl, data]` tuples — iterate them, don't assume they're a map:

```typescript
const entries = getManifestData('npm')
// ManifestEntry[] | undefined
for (const [purl, data] of entries ?? []) {
  console.log(purl, data.package, data.version)
}
```

### Get the full manifest

Zero-arg call returns every ecosystem. Useful for cross-ecosystem dashboards:

```typescript
const manifest = getManifestData()
// Manifest
for (const [eco, entries] of Object.entries(manifest)) {
  console.log(`${eco}: ${entries.length} overrides`)
}
```

## Types

```typescript
import type {
  CategoryString,
  EcosystemString,
  InteropString,
  Manifest,
  ManifestEntry,
  ManifestEntryData,
  PURLString,
} from '@socketsecurity/registry/types'
```

## License

MIT
