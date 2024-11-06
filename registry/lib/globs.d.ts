declare interface GlobOptions {
  ignore?: string[]
  ignoreOriginals?: boolean
  recursive?: boolean
  [key: string]: any
}
declare function globLicenses(
  dirname: string,
  options?: GlobOptions
): Promise<string[]>
declare const globsModule: {
  getGlobMatcher: (
    patterns: string[],
    options?: GlobOptions
  ) => (filepath: string) => boolean
  globLicenses: typeof globLicenses
}
export = globsModule
