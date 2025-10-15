declare namespace Cacache {
  interface GetOptions {
    integrity?: string | undefined
    size?: number | undefined
    memoize?: boolean | undefined
  }

  interface PutOptions {
    integrity?: string | undefined
    size?: number | undefined
    // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
    metadata?: any | undefined
    memoize?: boolean | undefined
  }

  interface CacheEntry {
    data: Buffer
    integrity: string
    key: string
    // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
    metadata?: any | undefined
    path: string
    size: number
    time: number
  }

  interface LsEntry {
    key: string
    integrity: string
    path: string
    time: number
    size: number
    // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
    metadata?: any | undefined
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
  ls: {
    (cache: string): Promise<Record<string, Cacache.LsEntry>>
    stream: (cache: string) => AsyncIterable<Cacache.LsEntry>
  }
  tmp: {
    withTmp: (
      cache: string,
      // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
      opts: any,
      // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
      callback: (tmpDirPath: string) => Promise<any>,
      // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
    ) => Promise<any>
  }
  // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
  [key: string]: any
}

export = cacache
