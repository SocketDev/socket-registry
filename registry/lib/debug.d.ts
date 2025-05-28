declare const Debug: {
  isDebug(): boolean
  debugDir: typeof console.dir
  debugFn(
    fn: Function,
    ...args: Parameters<typeof console.log>
  ): ReturnType<typeof console.log>
  debugLog: typeof console.log
}
declare namespace Debug {}
export = Debug
