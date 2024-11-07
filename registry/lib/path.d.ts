declare function isNodeModules(filepath: string): boolean
declare function isRelative(filepath: string): boolean
declare function normalizePath(filePath: string): string
declare function splitPath(filepath: string): string[]
declare function trimLeadingDotSlash(filepath: string): string
declare const pathModule: {
  isNodeModules: typeof isNodeModules
  isRelative: typeof isRelative
  normalizePath: typeof normalizePath
  splitPath: typeof splitPath
  trimLeadingDotSlash: typeof trimLeadingDotSlash
}
export = pathModule
