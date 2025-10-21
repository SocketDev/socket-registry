# @socketsecurity/registry

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketsecurity/registry)](https://socket.dev/npm/package/@socketsecurity/registry)
[![CI - SocketDev/socket-registry](https://github.com/SocketDev/socket-registry/actions/workflows/_local-not-for-reuse-ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/_local-not-for-reuse-ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

> Programmatic access to Socket Registry manifest data and types.

## Installation

```bash
pnpm install @socketsecurity/registry
```

## Features

- **Zero dependencies** — No runtime dependencies
- **Manifest API** — Query package override metadata by ecosystem and package name
- **Type Definitions** — Full TypeScript support with comprehensive type exports
- **Lightweight** — Only ~5KB of code

## Quick Start

```typescript
import { getManifestData, PURL_Type } from '@socketsecurity/registry'

// Get all manifest data
const manifest = getManifestData()

// Get all npm ecosystem packages
const npmPackages = getManifestData('npm')
// or
const npmPackages = getManifestData(PURL_Type.NPM)

// Get specific package data
const packageData = getManifestData('npm', 'deep-equal')

if (packageData) {
  console.log(packageData.name) // '@socketregistry/deep-equal'
  console.log(packageData.package) // 'deep-equal'
  console.log(packageData.version) // '2.2.3'
  console.log(packageData.categories) // ['speedup', 'cleanup']
  console.log(packageData.interop) // ['cjs', 'esm']
  console.log(packageData.license) // 'MIT'
  console.log(packageData.engines?.node) // '>=18'
  console.log(packageData.deprecated) // false
}
```

## API Reference

### `getManifestData()`

Query the Socket Registry manifest for package overrides.

#### Overloads

```typescript
// Get entire manifest (all ecosystems)
function getManifestData(): Manifest

// Get all packages for an ecosystem
function getManifestData(
  ecosystem: string
): ManifestEntry[] | undefined

// Get specific package data
function getManifestData(
  ecosystem: string,
  packageName: string
): ManifestEntryData | ManifestEntry | undefined
```

#### Examples

```typescript
// Get everything
const allData = getManifestData()
console.log(Object.keys(allData)) // ['npm']

// Get npm packages
const npmEntries = getManifestData('npm')
console.log(npmEntries.length) // 143

// Get specific package
const pkg = getManifestData('npm', 'deep-equal')
```

### `version`

Package version constant.

```typescript
import { version } from '@socketsecurity/registry'

console.log(version) // '2.0.0'
```

## Type Definitions

All types are exported for TypeScript projects:

```typescript
import type {
  CategoryString,
  EcosystemString,
  InteropString,
  Manifest,
  ManifestEntry,
  ManifestEntryData,
  PURL_Type,
  PURLString,
} from '@socketsecurity/registry'
```

### Type Details

#### `ManifestEntryData`

Package metadata structure:

```typescript
type ManifestEntryData = {
  categories?: CategoryString[]
  deprecated?: boolean
  engines?: Record<string, string>
  interop?: InteropString[]
  license?: string
  name: string // Socket registry package name
  package: string // Original package name
  version: string
  [key: string]: unknown
}
```

#### `ManifestEntry`

Tuple of PURL and package data:

```typescript
type ManifestEntry = [
  packageName: string, // PURL format: 'pkg:npm/%40socketregistry/deep-equal@2.2.3'
  data: ManifestEntryData
]
```

#### `Manifest`

Complete manifest structure:

```typescript
type Manifest = Record<EcosystemString, ManifestEntry[]>
```

### Enums

#### `PURL_Type`

Package URL ecosystem types:

```typescript
enum PURL_Type {
  APK = 'apk',
  BITBUCKET = 'bitbucket',
  CARGO = 'cargo',
  COCOAPODS = 'cocoapods',
  COMPOSER = 'composer',
  CONAN = 'conan',
  CONDA = 'conda',
  CRAN = 'cran',
  DEB = 'deb',
  DOCKER = 'docker',
  GEM = 'gem',
  GENERIC = 'generic',
  GITHUB = 'github',
  GOLANG = 'golang',
  HACKAGE = 'hackage',
  HEX = 'hex',
  HUGGINGFACE = 'huggingface',
  MAVEN = 'maven',
  MLFLOW = 'mlflow',
  NPM = 'npm',
  NUGET = 'nuget',
  OCI = 'oci',
  PUB = 'pub',
  PYPI = 'pypi',
  QPKG = 'qpkg',
  RPM = 'rpm',
  SWID = 'swid',
  SWIFT = 'swift',
  VCS = 'vcs',
}
```

#### `CategoryString`

Package categorization:

```typescript
type CategoryString =
  | 'cleanup' // Reduced dependencies
  | 'levelup' // New features
  | 'speedup' // Performance improvements
  | 'tuneup' // Security fixes
```

#### `InteropString`

Module interoperability modes:

```typescript
type InteropString =
  | 'browserify' // Browserify compatible
  | 'cjs' // CommonJS
  | 'esm' // ES Modules
```

## Additional Exports

The package also exports static files for direct access:

```typescript
// Access manifest JSON directly
import manifest from '@socketsecurity/registry/manifest.json'

// Access package.json
import pkg from '@socketsecurity/registry/package.json'

// Access extensions mapping
import extensions from '@socketsecurity/registry/extensions.json'
```

## Breaking Changes in v2.0.0

Version 2.0.0 is a major rewrite that removes all utility libraries and focuses solely on manifest data access:

- ❌ Removed all utility subpath exports (constants, lib utilities, etc.)
- ❌ Removed all runtime dependencies
- ✅ Simplified to just manifest API and types
- ✅ Zero dependencies at runtime

If you need the old utility functions, pin to v1.x or migrate to standalone packages.

## License

MIT
