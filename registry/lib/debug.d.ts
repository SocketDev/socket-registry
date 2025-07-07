import { InspectOptions } from 'node:util'

declare const Debug: {
  isDebug(namespaces?: string | undefined): boolean
  debugDir(namespaces: string, obj: any, options?: InspectOptions): void
  debugFn(namespaces: string, message?: any, ...optionalParams: any[]): void
  debugLog(namespaces: string, message?: any, ...optionalParams: any[]): void
}
declare namespace Debug {}
export = Debug
