/// <reference types="node" />
import bufferExports, { Buffer } from 'node:buffer'

declare interface SaferBuffer
  extends Omit<typeof bufferExports, 'Buffer' | 'BufferSlow'> {
  Buffer: Omit<typeof Buffer, 'allocUnsafe' | 'allocUnsafeSlow'>
}
declare const safer: SaferBuffer
export = safer
