// These types are from the DOM/Fetch API - declaring them here for TypeScript compatibility.
type RequestInit = globalThis.RequestInit
type RequestCache = globalThis.RequestCache

// Duplicated from make-fetch-happen package - fetch options interface.
interface MakeFetchOptions extends Omit<RequestInit, 'cache'> {
  cachePath?: string
  cache?: RequestCache | string
  proxy?: string
  noProxy?: string
  ca?: string
  cert?: string
  key?: string
  strictSSL?: boolean
  localAddress?: string
  maxSockets?: number
  retry?: any
  onRetry?: Function
  integrity?: string
  signal?: AbortSignal
}

type MakeFetchHappenFetcher = ((
  url: string,
  opts?: MakeFetchOptions,
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
) => Promise<Response>) & {
  defaults: (opts: MakeFetchOptions) => MakeFetchHappenFetcher
  delete: (url: string, opts?: MakeFetchOptions) => Promise<boolean>
}

import makeFetchHappen from 'make-fetch-happen'

export default makeFetchHappen as unknown as MakeFetchHappenFetcher
