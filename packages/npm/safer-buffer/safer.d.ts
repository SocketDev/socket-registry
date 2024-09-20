/// <reference types="node" />
import builtinBufferExports, { Buffer } from 'node:buffer'
declare interface SaferBuffer
  extends Omit<typeof builtinBufferExports, 'Buffer' | 'BufferSlow'> {
  Buffer: Omit<typeof Buffer, 'allocUnsafe' | 'allocUnsafeSlow'>
}
declare const safer: SaferBuffer
export = safer
