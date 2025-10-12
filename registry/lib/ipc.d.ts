/**
 * IPC (Inter-Process Communication) utilities for secure data passing between processes.
 *
 * This module provides secure inter-process communication utilities for Socket CLI
 * and related tools. It replaces environment variable passing with more secure and
 * scalable alternatives.
 */

/**
 * IPC message structure for secure data transfer.
 * All IPC messages conform to this structure with runtime validation.
 */
export interface IpcMessage<T = any> {
  /** Unique identifier for message tracking and response correlation. */
  id: string
  /** Unix timestamp for freshness validation and replay prevention. */
  timestamp: number
  /** Message type identifier for routing and handling. */
  type: string
  /** Payload data - can be any JSON-serializable value. */
  data: T
}

/**
 * IPC handshake message structure.
 */
export interface IpcHandshake
  extends IpcMessage<{
    version: string
    pid: number
    apiToken?: string
    appName: string
  }> {
  type: 'handshake'
}

/**
 * IPC stub file structure.
 */
export interface IpcStub {
  pid: number
  timestamp: number
  data: unknown
}

/**
 * Options for IPC communication.
 */
export interface IpcOptions {
  /** Timeout in milliseconds for async operations. */
  timeout?: number
  /** Text encoding for message serialization. */
  encoding?: BufferEncoding
}

/**
 * Get the IPC stub path for a given application.
 * Currently the only active method - used by socket-cli for self-update.
 */
export function getIpcStubPath(appName: string): string

// Commented out methods reserved for future implementation:
// export function cleanupIpcStubs(appName: string): Promise<void>
// export function createIpcChannelId(prefix?: string): string
// export function createIpcMessage<T = any>(type: string, data: T): IpcMessage<T>
// export function hasIpcChannel(process: any): boolean
// export function onIpc(handler: (message: IpcMessage) => void): () => void
// export function parseIpcMessage(message: any): IpcMessage | null
// export function readIpcStub(stubPath: string): Promise<any>
// export function sendIpc(process: NodeJS.Process | any, message: IpcMessage): boolean
// export function waitForIpc<T = any>(messageType: string, options?: IpcOptions): Promise<T>
// export function writeIpcStub(appName: string, data: any): Promise<string>
