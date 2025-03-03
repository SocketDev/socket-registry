import { GlobOptions as TinyGlobOptions } from 'tinyglobby'
import constants from './constants'
import { Remap } from './objects'

declare type GlobOptions = Remap<
  TinyGlobOptions & {
    ignoreOriginals?: boolean | undefined
    recursive?: boolean | undefined
  }
>
declare type Internals = (typeof constants)[typeof constants.kInternalsSymbol]
declare const Globs: {
  getGlobMatcher: Internals['getGlobMatcher']
  globLicenses(dirname: string, options?: GlobOptions): Promise<string[]>
}
declare namespace Globs {
  export { GlobOptions, Internals }
}
export = Globs
