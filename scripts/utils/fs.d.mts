/**
 * @fileoverview TypeScript declarations for file system utilities.
 */

import type { Spinner } from '@socketsecurity/registry/lib/spinner'

export interface TrashOptions {
  /** Concurrency for removal operations (default: from constants) */
  concurrency?: number | undefined
  /** Spinner instance for warnings */
  spinner?: Spinner | undefined
  /** Force removal (default: true) */
  force?: boolean | undefined
  /** Remove recursively (default: true) */
  recursive?: boolean | undefined
}

/**
 * Remove files/directories using trash bin with safe fallback.
 * In CI environments, skips trash for performance and uses safe `remove` (del).
 * For temp directories, silently ignores failures since system cleanup will handle them.
 *
 * @param paths - Path(s) to remove
 * @param options - Options for removal
 */
export function trash(
  paths: string | string[],
  options?: TrashOptions | undefined,
): Promise<void>
