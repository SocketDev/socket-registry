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

import os from 'node:os'
import path from 'node:path'

import CACHE_DIR from './constants/CACHE_DIR'
import CACHE_GITHUB_DIR from './constants/CACHE_GITHUB_DIR'
import CACHE_TTL_DIR from './constants/CACHE_TTL_DIR'
import DOT_SOCKET_DIR from './constants/DOT_SOCKET_DIR'
import SOCKET_APP_PREFIX from './constants/SOCKET_APP_PREFIX'
import SOCKET_CLI_APP_NAME from './constants/SOCKET_CLI_APP_NAME'
import SOCKET_DLX_APP_NAME from './constants/SOCKET_DLX_APP_NAME'
import SOCKET_REGISTRY_APP_NAME from './constants/SOCKET_REGISTRY_APP_NAME'
import { normalizePath } from './path'

/**
 * Get the Socket user directory (~/.socket).
 */
export function getSocketUserDir(): string {
  return normalizePath(path.join(os.homedir(), DOT_SOCKET_DIR))
}

/**
 * Get a Socket app directory (~/.socket/_<appName>).
 */
export function getSocketAppDir(appName: string): string {
  return normalizePath(
    path.join(getSocketUserDir(), `${SOCKET_APP_PREFIX}${appName}`),
  )
}

/**
 * Get the Socket cacache directory (~/.socket/_cacache).
 */
export function getSocketCacacheDir(): string {
  return normalizePath(
    path.join(getSocketUserDir(), `${SOCKET_APP_PREFIX}cacache`),
  )
}

/**
 * Get the Socket DLX directory (~/.socket/_dlx).
 */
export function getSocketDlxDir(): string {
  return normalizePath(
    path.join(getSocketUserDir(), `${SOCKET_APP_PREFIX}${SOCKET_DLX_APP_NAME}`),
  )
}

/**
 * Get a Socket app cache directory (~/.socket/_<appName>/cache).
 */
export function getSocketAppCacheDir(appName: string): string {
  return normalizePath(path.join(getSocketAppDir(appName), CACHE_DIR))
}

/**
 * Get a Socket app TTL cache directory (~/.socket/_<appName>/cache/ttl).
 */
export function getSocketAppCacheTtlDir(appName: string): string {
  return normalizePath(path.join(getSocketAppCacheDir(appName), CACHE_TTL_DIR))
}

/**
 * Get the Socket CLI directory (~/.socket/_socket).
 */
export function getSocketCliDir(): string {
  return getSocketAppDir(SOCKET_CLI_APP_NAME)
}

/**
 * Get the Socket Registry directory (~/.socket/_registry).
 */
export function getSocketRegistryDir(): string {
  return getSocketAppDir(SOCKET_REGISTRY_APP_NAME)
}

/**
 * Get the Socket Registry GitHub cache directory (~/.socket/_registry/cache/ttl/github).
 */
export function getSocketRegistryGithubCacheDir(): string {
  return normalizePath(
    path.join(
      getSocketAppCacheTtlDir(SOCKET_REGISTRY_APP_NAME),
      CACHE_GITHUB_DIR,
    ),
  )
}
