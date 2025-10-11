/**
 * IPC (Inter-Process Communication) utilities for Socket ecosystem.
 * Provides common utilities for IPC stub files and communication.
 */

import os from 'node:os'
import path from 'node:path'

/**
 * Get the path to the IPC stub file.
 * This is used for inter-process communication during operations like self-update.
 * @returns The path to the IPC stub file.
 */
export function getIpcStubPath(appName = 'socket'): string {
  const tmpDir = os.tmpdir()
  return path.join(tmpDir, `${appName}-ipc.stub`)
}

/**
 * Get the path to the IPC socket file.
 * Used for Unix domain socket communication.
 * @returns The path to the IPC socket file.
 */
export function getIpcSocketPath(appName = 'socket'): string {
  const tmpDir = os.tmpdir()
  return path.join(tmpDir, `${appName}-ipc.sock`)
}

/**
 * Get the path to the IPC lock file.
 * Used to coordinate between processes.
 * @returns The path to the IPC lock file.
 */
export function getIpcLockPath(appName = 'socket'): string {
  const tmpDir = os.tmpdir()
  return path.join(tmpDir, `${appName}-ipc.lock`)
}

/**
 * Get the path to the IPC pid file.
 * Used to track process IDs for IPC coordination.
 * @returns The path to the IPC pid file.
 */
export function getIpcPidPath(appName = 'socket'): string {
  const tmpDir = os.tmpdir()
  return path.join(tmpDir, `${appName}-ipc.pid`)
}

/**
 * Get the base IPC directory path.
 * @returns The base IPC directory path.
 */
export function getIpcBasePath(): string {
  return os.tmpdir()
}