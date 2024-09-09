/// <reference types="node" />
import { parse } from 'node:path'
declare const {
  x: PathParse
}: {
  x: typeof parse & {
    posix: typeof parse
    win32: typeof parse
  }
}
export = PathParse
