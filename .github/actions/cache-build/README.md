# Cache Build Artifacts Action

Caches the `registry/dist` directory and TypeScript build info files to speed up CI builds.

## Usage

Add this action before running the build step in your workflow:

```yaml
- uses: ./.github/actions/cache-build
  with:
    node-version: '22'  # optional, defaults to '22'

- name: Build
  run: pnpm run build
```

## Cache Key Strategy

The cache key is based on:
- Runner OS (linux, windows, macos)
- Node.js version
- Hash of source files (`registry/src/**/*.ts`)
- Hash of TypeScript config files

## Benefits

- **Faster builds**: Reuses compiled artifacts when source hasn't changed
- **Reduced CI time**: Skips rebuild if only tests or docs changed
- **Better resource usage**: Fewer TypeScript compilation runs

## Cache Invalidation

Cache automatically invalidates when:
- Source files in `registry/src/` change
- TypeScript configuration changes
- Node.js version changes
- Runner OS changes

## Notes

- Currently not integrated into the main CI workflow (uses reusable workflow)
- Can be added to custom workflows or future CI optimizations
- Works well with pnpm's built-in dependency caching
