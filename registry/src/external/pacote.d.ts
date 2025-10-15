declare class RegistryFetcher {
  // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
  constructor(spec: string, opts?: any)
  cache: string
}

declare const pacote: {
  RegistryFetcher: typeof RegistryFetcher
  // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
  extract(spec: string, dest: string, opts?: any): Promise<any>
  // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
  manifest(spec: string, opts?: any): Promise<any>
  // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
  packument(spec: string, opts?: any): Promise<any>
  // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
  tarball(spec: string, opts?: any): Promise<Buffer>
}

export = pacote
