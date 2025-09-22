/// <reference types="node" />
import { promisify } from 'node:util'

declare const {
  x: Impl,
}: {
  x: typeof promisify & {
    custom: symbol
    customPromisifyArgs: symbol
  }
}
export = Impl
