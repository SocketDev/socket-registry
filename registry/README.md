# @socketsecurity/registry

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketsecurity/registry)](https://socket.dev/npm/package/@socketsecurity/registry)
[![CI](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

Query Socket Registry manifest data. Zero dependencies, ~5KB.

## Installation

```bash
pnpm install @socketsecurity/registry
```

## Usage

```typescript
import { getManifestData, PURL_Type } from '@socketsecurity/registry'

// Get all manifest data
const manifest = getManifestData()

// Get ecosystem packages
const npmPackages = getManifestData('npm')

// Get specific package
const pkg = getManifestData('npm', 'deep-equal')
console.log(pkg.name) // '@socketregistry/deep-equal'
console.log(pkg.version) // '2.2.3'
console.log(pkg.categories) // ['speedup', 'cleanup']
```

## API

### `getManifestData()`

```typescript
function getManifestData(): Manifest
function getManifestData(ecosystem: string): ManifestEntry[] | undefined
function getManifestData(ecosystem: string, packageName: string): ManifestEntryData | ManifestEntry | undefined
```

### `version`

```typescript
import { version } from '@socketsecurity/registry'
```

## Types

```typescript
type ManifestEntryData = {
  categories?: ('cleanup' | 'levelup' | 'speedup' | 'tuneup')[]
  deprecated?: boolean
  engines?: Record<string, string>
  interop?: ('browserify' | 'cjs' | 'esm')[]
  license?: string
  name: string // Socket registry name
  package: string // Original package name
  version: string
  [key: string]: unknown
}

type ManifestEntry = [purl: string, data: ManifestEntryData]
type Manifest = Record<string, ManifestEntry[]>
```

### `PURL_Type` enum

Ecosystem identifiers: `APK`, `BITBUCKET`, `CARGO`, `COCOAPODS`, `COMPOSER`, `CONAN`, `CONDA`, `CRAN`, `DEB`, `DOCKER`, `GEM`, `GENERIC`, `GITHUB`, `GOLANG`, `HACKAGE`, `HEX`, `HUGGINGFACE`, `MAVEN`, `MLFLOW`, `NPM`, `NUGET`, `OCI`, `PUB`, `PYPI`, `QPKG`, `RPM`, `SWID`, `SWIFT`, `VCS`

## Additional Exports

```typescript
import manifest from '@socketsecurity/registry/manifest.json'
import pkg from '@socketsecurity/registry/package.json'
import extensions from '@socketsecurity/registry/extensions.json'
```

## Breaking Changes in v2.0.0

- Removed all utility subpath exports (constants, lib utilities, etc.)
- Removed all runtime dependencies
- Focused solely on manifest data access

Pin to v1.x if you need the removed utilities.

## License

MIT
