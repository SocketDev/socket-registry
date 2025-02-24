declare const Path: {
  isNodes(filepath: string): boolean
  isRelative(filepath: string): boolean
  normalizePath(filePath: string): string
  splitPath(filepath: string): string[]
  trimLeadingDotSlash(filepath: string): string
}
declare namespace Path {}
export = Path
