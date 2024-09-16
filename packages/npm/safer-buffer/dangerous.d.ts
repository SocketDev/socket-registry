/// <reference types="node" />
import builtinBufferExports from 'node:buffer'
declare interface DangerousBufferModuleExports
  extends Omit<typeof builtinBufferExports, 'BufferSlow'> {}
export = DangerousBufferModuleExports
