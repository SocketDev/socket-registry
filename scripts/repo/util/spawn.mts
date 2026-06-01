/**
 * @file Spawn utilities wrapper for scripts. Provides access to spawn utilities
 *   for scripts.
 */

export { isSpawnError } from '@socketsecurity/lib-stable/process/spawn/errors'
export {
  spawn,
  spawnSync,
} from '@socketsecurity/lib-stable/process/spawn/child'
export { isStdioType } from '@socketsecurity/lib-stable/process/spawn/stdio'
