// biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
declare function libnpmpack(spec: string, options?: any): Promise<any>
export = libnpmpack
