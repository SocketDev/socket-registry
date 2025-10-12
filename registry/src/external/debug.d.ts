interface Debug {
  (namespace: string): DebugInstance
  enable(namespaces: string): void
  disable(): void
  enabled(namespace: string): boolean
  inspectOpts?: {
    showHidden?: boolean | null
    depth?: number | boolean | null
    colors?: boolean
    [key: string]: any
  }
}

interface DebugInstance {
  (...args: any[]): void
  enabled: boolean
  log: (...args: any[]) => void
  namespace: string
}

declare const debug: Debug
export = debug
