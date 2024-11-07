import { PicomatchOptions } from 'picomatch'
import { GlobOptions as TinyGlobOptions } from 'tinyglobby'

declare interface GlobOptions extends TinyGlobOptions {
  ignoreOriginals?: boolean
  recursive?: boolean
}
declare function globLicenses(
  dirname: string,
  options?: GlobOptions
): Promise<string[]>
declare const globsModule: {
  getGlobMatcher: (
    patterns: string[],
    options?: PicomatchOptions
  ) => (filepath: string) => boolean
  globLicenses: typeof globLicenses
}
export = globsModule
