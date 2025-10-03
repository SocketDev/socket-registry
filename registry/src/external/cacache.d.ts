declare namespace Cacache {
  interface GetOptions {
    integrity?: string | undefined
    size?: number | undefined
    memoize?: boolean | undefined
  }

  interface PutOptions {
    integrity?: string | undefined
    size?: number | undefined
    metadata?: any | undefined
    memoize?: boolean | undefined
  }

  interface CacheEntry {
    data: Buffer
    integrity: string
    key: string
    metadata?: any | undefined
    path: string
    size: number
    time: number
  }
}

declare const cacache: {
  get: {
    (
      cache: string,
      key: string,
      options?: Cacache.GetOptions,
    ): Promise<Cacache.CacheEntry>
    sync: (
      cache: string,
      key: string,
      options?: Cacache.GetOptions,
    ) => Cacache.CacheEntry
  }
  put: {
    (
      cache: string,
      key: string,
      data: string | Buffer,
      options?: Cacache.PutOptions,
    ): Promise<{ integrity: string; size: number }>
    sync: (
      cache: string,
      key: string,
      data: string | Buffer,
      options?: Cacache.PutOptions,
    ) => { integrity: string; size: number }
  }
  rm: {
    entry: {
      (cache: string, key: string): Promise<void>
      sync: (cache: string, key: string) => void
    }
    all: {
      (cache: string): Promise<void>
      sync: (cache: string) => void
    }
  }
  tmp: {
    withTmp: (
      cache: string,
      opts: any,
      callback: (tmpDirPath: string) => Promise<any>,
    ) => Promise<any>
  }
  [key: string]: any
}

export = cacache
