interface FetchOptions {
  cache?: string
  headers?: Record<string, string>
  [key: string]: any
}

declare function makeFetchHappen(
  url: string,
  opts?: FetchOptions,
): Promise<Response>
declare namespace makeFetchHappen {
  function defaults(opts: FetchOptions): typeof makeFetchHappen
}

export = makeFetchHappen
