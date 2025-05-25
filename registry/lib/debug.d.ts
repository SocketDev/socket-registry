declare const Debug: {
  isDebug(): boolean
  debugDir: typeof console.dir
  debugLog: typeof console.log
}
declare namespace Debug {}
export = Debug
