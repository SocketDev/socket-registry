# Build Architecture

## External Dependencies

### Overview

The registry uses a specialized architecture for managing dependencies to optimize bundle size and ensure clean separation between bundled and external code.

### Dependency Types

#### dependencies (Runtime)

The following package is a **runtime dependency** because it's a separate package:

```json
"@socketregistry/packageurl-js": "1.3.0"
```

This package:
- Is a separate package that depends on registry
- Can be re-exported from `src/external/`
- Is listed in ALLOWED_EXTERNAL_PACKAGES

#### devDependencies (Build-time, Vendored)

Other @socketregistry and @socketsecurity packages are **vendored** into `src/external/`:
- The source code is copied directly into external files
- They do NOT need to be listed in any dependencies
- They are standalone, bundled code

### The src/external/ Layer

#### Purpose

`src/external/` contains **vendored/bundled source code** from dependencies.

#### Import Rules

**Inside src/external/**: Files must contain bundled/vendored code
```javascript
// src/external/@socketregistry/is-unicode-supported.js
// Contains the full source code, not a re-export
module.exports = function isUnicodeSupported() {
  // ... implementation ...
}
```

**Outside src/external/**: Must use relative paths
```javascript
// src/lib/logger.ts - CORRECT
require('../external/@socketregistry/is-unicode-supported')()

// src/lib/logger.ts - INCORRECT
require('@socketregistry/is-unicode-supported')
```

### Validation

The `scripts/validate-external.mjs` script enforces these rules:

- Scans all files in `src/external/`
- Detects re-exports of `@socketregistry/*` and `@socketsecurity/*` packages (except allowed)
- Ensures external files contain bundled code, not `require('@package')` re-exports

Run validation:
```bash
node scripts/validate-external.mjs
```

Forbidden patterns in `src/external/` (except ALLOWED_EXTERNAL_PACKAGES):
- `require('@socketregistry/package-name')`
- `from '@socketregistry/package-name'`
- `require('@socketsecurity/package-name')`
- `from '@socketsecurity/package-name'`

Allowed:
- `@socketregistry/packageurl-js` - separate package, listed in dependencies

### Build Process

#### src/external/ Files

Files in `src/external/`:
1. Are validated before build (must be bundled code)
2. Copied to `dist/external/` by `scripts/rollup/build-external.mjs`
3. The bundled code is included in the dist output

#### Rollup Configuration

The main rollup config (`.config/rollup.dist.config.mjs`) externalizes:
- Node.js built-ins
- `node_modules` dependencies
- Paths containing `/external/`

### Why This Architecture?

1. **No Runtime Dependencies**: Vendored code means no external dependencies needed
2. **Clear Boundaries**: `src/external/` contains only bundled/vendored code
3. **Build-time Validation**: Automatic detection of accidental re-exports
4. **Smaller Bundles**: Only include what's actually used
5. **Maintainability**: Clear rules about what external files can contain

### Common Mistakes

❌ **Re-exporting from npm in src/external/**
```javascript
// src/external/@socketregistry/yocto-spinner.js - WRONG
module.exports = require('@socketregistry/yocto-spinner')
```

❌ **Adding vendored packages to devDependencies**
```json
"devDependencies": {
  "@socketregistry/yocto-spinner": "1.0.24"  // WRONG - it's vendored
}
```

❌ **Bare imports outside src/external/**
```javascript
// src/lib/logger.ts - WRONG
require('@socketregistry/is-unicode-supported')
```

✅ **Correct patterns**
```javascript
// src/external/@socketregistry/yocto-spinner.js - CORRECT
module.exports = function yoctoSpinner(options) {
  // ... full bundled implementation ...
}
```

```javascript
// src/lib/logger.ts - CORRECT
require('../external/@socketregistry/is-unicode-supported')
```

```json
// package.json - CORRECT
"dependencies": {
  "@socketregistry/packageurl-js": "1.3.0"
}
```

### Troubleshooting

**"Cannot find module '@socketregistry/package-name'" at runtime**

This means a package is being required directly but isn't in dependencies. Check if:
1. It should be vendored into `src/external/` as bundled code
2. It should be added to `dependencies` and ALLOWED_EXTERNAL_PACKAGES

**Validation fails for external file**

The external file contains a re-export instead of bundled code. Either:
1. Vendor the source code directly into the file
2. Add the package to ALLOWED_EXTERNAL_PACKAGES and `dependencies` if it's meant to be a runtime dependency

**How to vendor a new dependency**

1. Copy the source code into `src/external/@scope/package-name.js`
2. Ensure it doesn't `require()` the npm package
3. Run `pnpm run validate:external` to verify
4. The code will be bundled during build
