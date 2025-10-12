/**
 * @fileoverview Default timeout values for async operations to prevent resource exhaustion.
 */

// Network operations (30-120 seconds).
// 30 seconds for HTTP requests.
export const TIMEOUT_HTTP_REQUEST = 30_000
// 2 minutes for downloads.
export const TIMEOUT_HTTP_DOWNLOAD = 120_000

// Package manager operations (5 minutes).
// 5 minutes for npm/pnpm/yarn install.
export const TIMEOUT_PACKAGE_INSTALL = 300_000
// 2 minutes for other package commands.
export const TIMEOUT_PACKAGE_COMMAND = 120_000

// Git operations (30 seconds).
// 30 seconds for git commands.
export const TIMEOUT_GIT_OPERATION = 30_000

// Binary execution (1-10 minutes).
// 1 minute for general binary execution.
export const TIMEOUT_BINARY_EXEC = 60_000
// 10 minutes for dlx binary execution.
export const TIMEOUT_DLX_BINARY = 600_000

// Build operations.
// 3 minutes for archive extraction.
export const TIMEOUT_BUILD_EXTRACT = 180_000
// 1 minute for code signing.
export const TIMEOUT_BUILD_SIGN = 60_000
// 3 minutes for SEA blob generation.
export const TIMEOUT_SEA_BUILD = 180_000

// General spawn operations (2 minutes).
// 2 minutes for general spawn operations.
export const TIMEOUT_SPAWN_DEFAULT = 120_000
