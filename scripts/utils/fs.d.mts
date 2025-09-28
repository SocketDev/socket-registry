/**
 * @fileoverview TypeScript declarations for file system utilities.
 */

import type { Spinner } from '@socketsecurity/registry/lib/spinner'

export interface SafeRemoveOptions {
  /** Concurrency for fs.rm operations (default: from constants) */
  concurrency?: number | undefined
  /** Spinner instance for warnings */
  spinner?: Spinner | undefined
  /** Force removal (default: true) */
  force?: boolean | undefined
  /** Remove recursively (default: true) */
  recursive?: boolean | undefined
}

/**
 * Safely remove files/directories using trash, with fallback to fs.rm.
 * In CI environments, skips trash for performance. For temp directories,
 * silently ignores failures since system cleanup will handle them.
 *
 * @param paths - Path(s) to remove
 * @param options - Options for removal
 */
export function safeRemove(
  paths: string | string[],
  options?: SafeRemoveOptions,
): Promise<void>
