/**
 * Package manager agent constants.
 * Agent names, lockfile names, registry URLs, and configuration field names.
 */

// Agent names.
export const NPM = 'npm'
export const PNPM = 'pnpm'
export const YARN = 'yarn'
export const BUN = 'bun'
export const VLT = 'vlt'
export const NPX = 'npx'

// NPM registry URL.
export const NPM_REGISTRY_URL = 'https://registry.npmjs.org'

// Agent variants.
export const YARN_BERRY = 'yarn/berry'
export const YARN_CLASSIC = 'yarn/classic'

// Lock files.
export const PACKAGE_LOCK = 'package-lock'
export const PACKAGE_LOCK_JSON = 'package-lock.json'
export const NPM_SHRINKWRAP_JSON = 'npm-shrinkwrap.json'
export const PNPM_LOCK = 'pnpm-lock'
export const PNPM_LOCK_YAML = 'pnpm-lock.yaml'
export const YARN_LOCK = 'yarn.lock'
export const BUN_LOCK = 'bun.lock'
export const BUN_LOCKB = 'bun.lockb'
export const VLT_LOCK_JSON = 'vlt-lock.json'

// Workspace configuration.
export const PNPM_WORKSPACE_YAML = 'pnpm-workspace.yaml'

// Package.json fields for dependency overrides.
export const OVERRIDES = 'overrides'
export const RESOLUTIONS = 'resolutions'
