/// <reference types="node" />
import builtinBufferExports from 'node:buffer'
declare interface DangerousBuffer
  extends Omit<typeof builtinBufferExports, 'BufferSlow'> {}
declare const dangerous: DangerousBuffer
export = dangerous
