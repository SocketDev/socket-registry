declare const Debug: {
  isDebug(): boolean
  debugDir: typeof console.dir
  debugFn: typeof console.log
  debugLog: typeof console.log
}
declare namespace Debug {}
export = Debug
