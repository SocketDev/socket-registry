declare interface InternalShared {
  isRegExpProtoFlagsOrderBuggy(flagsGetter: () => string): boolean
}
declare const shared: InternalShared
export = shared
