/// <reference types="node" />
import * as nodeBuffer from 'node:buffer'

declare const SafeBuffer: typeof nodeBuffer.Buffer &
  Omit<typeof nodeBuffer, 'Buffer' | 'SlowBuffer'> & {
    Buffer: typeof SafeBuffer
  }
export = SafeBuffer
