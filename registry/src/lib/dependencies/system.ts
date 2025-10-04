/** @fileoverview System utility dependency registry. */

export type Which = typeof import('which')

export type PromiseSpawn = typeof import('@npmcli/promise-spawn')

export type StreamingIterables = {
  parallelMap: unknown
  transform: unknown
  [key: string]: unknown
}

interface SystemDependencies {
  promiseSpawn: PromiseSpawn | undefined
  streamingIterables: StreamingIterables | undefined
  which: Which | undefined
}

const dependencies: SystemDependencies = {
  promiseSpawn: undefined,
  streamingIterables: undefined,
  which: undefined,
}

/**
 * Get promise-spawn instance, lazily loading if not set.
 */
export function getPromiseSpawn(): PromiseSpawn {
  if (!dependencies.promiseSpawn) {
    dependencies.promiseSpawn = require('../../external/@npmcli/promise-spawn')
  }
  return dependencies.promiseSpawn!
}

/**
 * Get streaming-iterables instance, lazily loading if not set.
 */
export function getStreamingIterables(): StreamingIterables {
  if (!dependencies.streamingIterables) {
    dependencies.streamingIterables = require('../../external/streaming-iterables')
  }
  return dependencies.streamingIterables!
}

/**
 * Get which instance, lazily loading if not set.
 */
export function getWhich(): Which {
  if (!dependencies.which) {
    dependencies.which = require('../../external/which')
  }
  return dependencies.which!
}

/**
 * Set promise-spawn instance (useful for testing).
 */
export function setPromiseSpawn(promiseSpawn: PromiseSpawn): void {
  dependencies.promiseSpawn = promiseSpawn
}

/**
 * Set streaming-iterables instance (useful for testing).
 */
export function setStreamingIterables(
  streamingIterables: StreamingIterables,
): void {
  dependencies.streamingIterables = streamingIterables
}

/**
 * Set which instance (useful for testing).
 */
export function setWhich(which: Which): void {
  dependencies.which = which
}

/**
 * Reset all system dependencies to undefined (forces reload on next access).
 */
export function resetSystemDependencies(): void {
  dependencies.promiseSpawn = undefined
  dependencies.streamingIterables = undefined
  dependencies.which = undefined
}
