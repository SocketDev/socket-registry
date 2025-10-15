interface Debug {
  (namespace: string): DebugInstance
  enable(namespaces: string): void
  disable(): void
  enabled(namespace: string): boolean
  inspectOpts?: {
    showHidden?: boolean | null
    depth?: number | boolean | null
    colors?: boolean
    // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
    [key: string]: any
  }
}

interface DebugInstance {
  // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
  (...args: any[]): void
  enabled: boolean
  // biome-ignore lint/suspicious/noExplicitAny: External third-party type definition
  log: (...args: any[]) => void
  namespace: string
}

declare const debug: Debug
export = debug
