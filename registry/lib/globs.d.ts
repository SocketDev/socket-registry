import { GlobOptions as TinyGlobOptions } from 'tinyglobby'
import constants from './constants'

declare type Internals = (typeof constants)[typeof constants.kInternalsSymbol]
declare interface GlobOptions extends TinyGlobOptions {
  ignoreOriginals?: boolean
  recursive?: boolean
}
declare function globLicenses(
  dirname: string,
  options?: GlobOptions
): Promise<string[]>
declare const globsModule: {
  getGlobMatcher: Internals['getGlobMatcher']
  globLicenses: typeof globLicenses
}
export = globsModule
