import { InspectOptions } from 'node:util'

declare const Debug: {
  isDebug(namespace?: string | undefined): boolean
  debugDir(namespace: string, obj: any, options?: InspectOptions): void
  debugFn(namespace: string, message?: any, ...optionalParams: any[]): void
  debugLog(namespace: string, message?: any, ...optionalParams: any[]): void
}
declare namespace Debug {}
export = Debug
