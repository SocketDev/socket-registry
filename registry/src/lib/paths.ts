/**
 * @fileoverview Path utilities for Socket ecosystem directories.
 * Provides platform-aware path resolution for Socket tools' shared directory structure.
 *
 * Directory Structure:
 * ~/.socket/
 * ├── _cacache/           # Content-addressable cache (shared)
 * ├── _dlx/               # DLX tool installations (shared)
 * ├── _socket/            # Socket CLI app directory
 * ├── _registry/          # Socket Registry app directory
 * └── _sfw/               # Socket Firewall app directory
 */

import * as os from 'node:os'
import * as path from 'node:path'

import { SOCKET_CACACHE_DIR } from '#env/socket-cacache-dir'

import { normalizePath } from './path'

/**
 * Get the Socket home directory (~/.socket).
 * Alias for getSocketUserDir() for consistency across Socket projects.
 */
export function getSocketHomePath(): string {
  return getSocketUserDir()
}

/**
 * Get the Socket user directory (~/.socket).
 */
export function getSocketUserDir(): string {
  return normalizePath(
    path.join(
      os.homedir(),
      /*@__INLINE__*/ require('../constants/paths').DOT_SOCKET_DIR,
    ),
  )
}

/**
 * Get a Socket app directory (~/.socket/_<appName>).
 */
export function getSocketAppDir(appName: string): string {
  return normalizePath(
    path.join(
      getSocketUserDir(),
      `${/*@__INLINE__*/ require('../constants/socket').SOCKET_APP_PREFIX}${appName}`,
    ),
  )
}

/**
 * Get the Socket cacache directory (~/.socket/_cacache).
 * Can be overridden with SOCKET_CACACHE_DIR environment variable for testing.
 */
export function getSocketCacacheDir(): string {
  if (SOCKET_CACACHE_DIR) {
    return normalizePath(SOCKET_CACACHE_DIR)
  }
  return normalizePath(
    path.join(
      getSocketUserDir(),
      `${/*@__INLINE__*/ require('../constants/socket').SOCKET_APP_PREFIX}cacache`,
    ),
  )
}

/**
 * Get the Socket DLX directory (~/.socket/_dlx).
 */
export function getSocketDlxDir(): string {
  return normalizePath(
    path.join(
      getSocketUserDir(),
      `${/*@__INLINE__*/ require('../constants/socket').SOCKET_APP_PREFIX}${/*@__INLINE__*/ require('../constants/socket').SOCKET_DLX_APP_NAME}`,
    ),
  )
}

/**
 * Get a Socket app cache directory (~/.socket/_<appName>/cache).
 */
export function getSocketAppCacheDir(appName: string): string {
  return normalizePath(
    path.join(
      getSocketAppDir(appName),
      /*@__INLINE__*/ require('../constants/paths').CACHE_DIR,
    ),
  )
}

/**
 * Get a Socket app TTL cache directory (~/.socket/_<appName>/cache/ttl).
 */
export function getSocketAppCacheTtlDir(appName: string): string {
  return normalizePath(
    path.join(
      getSocketAppCacheDir(appName),
      /*@__INLINE__*/ require('../constants/paths').CACHE_TTL_DIR,
    ),
  )
}

/**
 * Get the Socket CLI directory (~/.socket/_socket).
 */
export function getSocketCliDir(): string {
  return getSocketAppDir(
    /*@__INLINE__*/ require('../constants/socket').SOCKET_CLI_APP_NAME,
  )
}

/**
 * Get the Socket Registry directory (~/.socket/_registry).
 */
export function getSocketRegistryDir(): string {
  return getSocketAppDir(
    /*@__INLINE__*/ require('../constants/socket').SOCKET_REGISTRY_APP_NAME,
  )
}

/**
 * Get the Socket Registry GitHub cache directory (~/.socket/_registry/cache/ttl/github).
 */
export function getSocketRegistryGithubCacheDir(): string {
  return normalizePath(
    path.join(
      getSocketAppCacheTtlDir(
        /*@__INLINE__*/ require('../constants/socket').SOCKET_REGISTRY_APP_NAME,
      ),
      /*@__INLINE__*/ require('../constants/github').CACHE_GITHUB_DIR,
    ),
  )
}
