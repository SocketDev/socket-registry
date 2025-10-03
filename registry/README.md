# @socketsecurity/registry

[![Socket Badge](https://socket.dev/api/badge/npm/package/@socketsecurity/registry)](https://socket.dev/npm/package/@socketsecurity/registry)
[![CI - SocketDev/socket-registry](https://github.com/SocketDev/socket-registry/actions/workflows/_local-not-for-reuse-ci.yml/badge.svg)](https://github.com/SocketDev/socket-registry/actions/workflows/_local-not-for-reuse-ci.yml)

[![Follow @SocketSecurity](https://img.shields.io/twitter/follow/SocketSecurity?style=social)](https://twitter.com/SocketSecurity)
[![Follow @socket.dev on Bluesky](https://img.shields.io/badge/Follow-@socket.dev-1DA1F2?style=social&logo=bluesky)](https://bsky.app/profile/socket.dev)

> Programmatic access to Socket Registry metadata, constants, and helper
> utilities for package management operations.

## Installation

```bash
pnpm install @socketsecurity/registry
```

## Features

- **Manifest API** — Query package override metadata by ecosystem and name
- **Constants** — Access Node.js, npm, and package manager constants
- **Type Definitions** — Full TypeScript support with comprehensive type exports
- **Helper Utilities** — File system, path, package, and process utilities

## Quick Start

```typescript
import { getManifestData, Categories, PURL_Type } from '@socketsecurity/registry'

// Get all manifest data
const manifest = getManifestData()

// Get npm ecosystem packages
const npmPackages = getManifestData(PURL_Type.NPM)

// Get specific package data
const packageData = getManifestData(PURL_Type.NPM, 'deep-equal')

if (packageData) {
  console.log(packageData.categories) // ['speedup', 'cleanup']
  console.log(packageData.version) // '2.2.3'
  console.log(packageData.engines.node) // '>=18'
}
```

## API Reference

### `getManifestData()`

Query the Socket Registry manifest for package overrides.

```typescript
// Get all ecosystems
function getManifestData(): Manifest

// Get all packages for an ecosystem
function getManifestData(ecosystem: EcosystemString): ManifestEntry[]

// Get specific package metadata
function getManifestData(
  ecosystem: EcosystemString,
  packageName: string,
): ManifestEntryData | undefined
```

### Enums

```typescript
enum Categories {
  CLEANUP = 'cleanup', // Reduced dependencies
  LEVELUP = 'levelup', // New features
  SPEEDUP = 'speedup', // Performance improvements
  TUNEUP = 'tuneup', // Security fixes
}

enum Interop {
  BROWSERIFY = 'browserify',
  CJS = 'cjs',
  ESM = 'esm',
}

enum PURL_Type {
  NPM = 'npm',
  PYPI = 'pypi',
  // ... and more ecosystem types
}
```

### Constants

Import Node.js and package manager constants:

```typescript
import {
  NODE_MODULES,
  PACKAGE_JSON,
  PNPM_LOCK_YAML,
  NPM_REGISTRY_URL,
} from '@socketsecurity/registry'
```

For a complete list of available constants, see the
[package.json exports](./package.json#L85).

## Type Definitions

All types are exported for TypeScript projects:

```typescript
import type {
  Manifest,
  ManifestEntry,
  ManifestEntryData,
  CategoryString,
  InteropString,
  EcosystemString,
} from '@socketsecurity/registry'
```

## Utilities

Access utility modules for common operations:

```typescript
// File system utilities
import { /* utilities */ } from '@socketsecurity/registry/lib/fs'

// Package utilities
import { /* utilities */ } from '@socketsecurity/registry/lib/packages'

// Path utilities
import { /* utilities */ } from '@socketsecurity/registry/lib/paths'

// And many more...
```

See the [exports map](./package.json#L85) for all available utility modules.

## License

MIT
