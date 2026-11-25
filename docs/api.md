# Package Catalog and Override Guide

Socket Registry is a monorepo of npm package overrides used by Socket Optimize. The override source is under [`packages/npm`](../packages/npm/). The published catalog API lives in [`registry/`](../registry/), and its checked-in [`manifest.json`](../registry/manifest.json) is the source of package names, versions, categories, engines, license, and interop metadata exposed to consumers.

## Published catalog API

Install `@socketsecurity/registry` to read the manifest. Its `getManifestData()` API has three forms: return the full manifest, list entries for an ecosystem, or look up one package by its upstream package name.

```ts
import { getManifestData } from '@socketsecurity/registry'

const all = getManifestData()
const npmEntries = getManifestData('npm')
const replacement = getManifestData('npm', 'deep-equal')
```

The ecosystem form returns raw `[purl, data]` tuples. A single-package result contains the override package name and version plus optional category, Node engine, interop, license, and additional metadata fields. Exact overloads and fields are in [`registry/src/index.mts`](../registry/src/index.mts) and [`registry/src/types.mts`](../registry/src/types.mts).

| Published path                             | Purpose                                      |
| ------------------------------------------ | -------------------------------------------- |
| `@socketsecurity/registry`                 | `getManifestData` and the root type exports. |
| `@socketsecurity/registry/types`           | Catalog and manifest types.                  |
| `@socketsecurity/registry/manifest.json`   | Static catalog data.                         |
| `@socketsecurity/registry/extensions.json` | Extension catalog data.                      |

## Current catalog

The checked-in manifest currently contains **133 npm entries**. The registry package is npm-only at this revision. Read `registry/manifest.json` for the current package set and each entry's current metadata.

Each manifest row contains a PURL and an entry record. The record includes `name`, `package`, and `version`; it may also include `categories`, `deprecated`, `engines`, `interop`, and `license`. The type declaration permits additional fields, so consumers should read fields they need and handle optional values.

| Category  | Meaning in current README                           |
| --------- | --------------------------------------------------- |
| `cleanup` | Reduce dependencies or use built-in functionality.  |
| `levelup` | Add features or modernize APIs.                     |
| `speedup` | Improve performance.                                |
| `tuneup`  | Address known CVEs while maintaining compatibility. |

## Using an override

Use the Socket CLI from a project root:

```sh
socket optimize
```

The CLI analyzes dependencies and suggests catalog replacements. For direct package-manager configuration, an override maps the original package name to a compatible Socket package. For example, the README shows the pnpm alias pattern:

```json
{
  "pnpm": {
    "overrides": {
      "packageurl-js": "npm:@socketregistry/packageurl-js@^1"
    }
  }
}
```

Use the version and alias form documented for the selected package. The root README describes the project quality criteria: tests from the original package, CommonJS/ESM support, retained license compatibility, TypeScript declarations, and current/LTS Node support.

## Override source layout

Each directory in `packages/npm/` is an override package. Its `package.json`, source files, tests, and README describe that package's actual API and compatibility details. Consult those files for package-specific guidance; the catalog does not replace the individual package documentation.

The published catalog is a generated package under `registry/`. Read its README for the consumer lookup examples. The override package inventory and detailed ranking evidence are in [`docs/npm-high-impact-rankings.md`](./npm-high-impact-rankings.md).

## Related references

- [Registry package guide](../registry/README.md)
- [Root project and contributor README](../README.md)
- [npm package source directories](../packages/npm/)
