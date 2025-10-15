/** @fileoverview Type declarations for external modules. */

declare module 'cacache' {
  export function get(
    cachePath: string,
    key: string,
    // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
    options?: any,
  ): Promise<{ data: Buffer }>
  export function put(
    cachePath: string,
    key: string,
    // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
    data: any,
    // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
    options?: any,
  ): Promise<void>
  export const rm: {
    (cachePath: string, key: string): Promise<void>
    all(cachePath: string): Promise<void>
    entry(cachePath: string, key: string): Promise<void>
  }
  // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
  export function ls(cachePath: string): Promise<Record<string, any>>
  export function verify(cachePath: string): Promise<void>
  export const tmp: {
    withTmp<T>(
      cachePath: string,
      // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
      opts: any,
      callback: (tmpDirPath: string) => Promise<T>,
    ): Promise<T>
  }
}

declare module 'pacote' {
  export class RegistryFetcher {
    // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
    constructor(spec: string, opts?: any)
    cache: string
  }
  // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
  export function extract(spec: string, dest: string, opts?: any): Promise<any>
  // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
  export function manifest(spec: string, opts?: any): Promise<any>
  // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
  export function packument(spec: string, opts?: any): Promise<any>
  // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
  export function tarball(spec: string, opts?: any): Promise<Buffer>
}

declare module 'make-fetch-happen' {
  interface FetchOptions {
    cache?: string
    headers?: Record<string, string>
    // biome-ignore lint/suspicious/noExplicitAny: External module type definitions.
    [key: string]: any
  }

  function makeFetchHappen(url: string, opts?: FetchOptions): Promise<Response>
  namespace makeFetchHappen {
    function defaults(opts: FetchOptions): typeof makeFetchHappen
  }

  export = makeFetchHappen
}
