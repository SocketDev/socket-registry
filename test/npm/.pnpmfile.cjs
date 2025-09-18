/**
 * @fileoverview pnpm configuration for test workspace.
 * Handles workspace references from the scripts package when it's installed
 * via file: reference. Since we're in a subdirectory with its own workspace,
 * we need to remove workspace:* references that won't resolve here.
 *
 * Note: This file must be self-contained and can't import from other packages
 * since it runs during pnpm's dependency resolution phase.
 */

// Must use hardcoded string as this runs before dependencies are available
// This matches the WORKSPACE_ANY constant from scripts/constants
const WORKSPACE_ANY = 'workspace:*'

module.exports = {
  hooks: {
    readPackage(pkg) {
      // Remove workspace:* references since we're in a subdirectory workspace
      // and these packages are available via file: references in our package.json
      if (pkg.dependencies) {
        for (const dep in pkg.dependencies) {
          if (pkg.dependencies[dep] === WORKSPACE_ANY) {
            delete pkg.dependencies[dep]
          }
        }
      }
      if (pkg.devDependencies) {
        for (const dep in pkg.devDependencies) {
          if (pkg.devDependencies[dep] === WORKSPACE_ANY) {
            delete pkg.devDependencies[dep]
          }
        }
      }
      return pkg
    }
  }
}
