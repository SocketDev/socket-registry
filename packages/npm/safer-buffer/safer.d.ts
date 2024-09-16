/// <reference types="node" />
import builtinBufferExports, { Buffer } from 'node:buffer'
declare interface SaferBufferModuleExports
  extends Omit<typeof builtinBufferExports, 'BufferSlow'> {
  Buffer: Omit<typeof Buffer, 'allocUnsafe' | 'allocUnsafeSlow'>
}
export = SaferBufferModuleExports
