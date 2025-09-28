// Type for cacache tmp options based on @types/cacache.
type CacacheTmpOptions = {
  concurrency?: number | undefined
  filter?: string | false | undefined
  log?: { [method: string]: (...args: any[]) => any } | undefined
  tmpPrefix?: string | null | undefined
}

// Duplicated from cacache package - temporary directory utility types.
// Note: The actual cacache.tmp.withTmp returns a Promise, unlike what @types/cacache suggests.
export interface CacacheTmp {
  withTmp: (
    cache: string,
    opts: CacacheTmpOptions | ((tmpDir: string) => Promise<any>),
    cb?: (tmpDir: string) => Promise<any> | undefined,
  ) => Promise<any>
  mkdir: (
    cache: string,
    opts?: CacacheTmpOptions | undefined,
  ) => Promise<{ path: string }>
}

// Duplicated from cacache package - main interface with tmp property.
export interface CacacheWithTmp {
  tmp: CacacheTmp
  get: any
  'get stream': any
  put: any
  'put stream': any
  rm: any
  verify: any
  'verify lastRun': any
  ls: any
  'ls stream': any
  clearMemoized: any
}

import * as cacacheModule from 'cacache'

// Type assertion to add the tmp property that's missing from @types/cacache.
const cacache = cacacheModule as typeof cacacheModule & CacacheWithTmp

export default cacache
