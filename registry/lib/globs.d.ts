import { GlobOptions as TinyGlobOptions } from 'tinyglobby'

import { Remap } from './objects'

declare type GlobOptions = Remap<
  TinyGlobOptions & {
    ignoreOriginals?: boolean | undefined
    recursive?: boolean | undefined
  }
>
declare const Globs: {
  getGlobMatcher: (
    glob: string | string[] | readonly string[],
    options?: object | undefined
  ) => (path: string) => boolean
  globLicenses(dirname: string, options?: GlobOptions): Promise<string[]>
}
declare namespace Globs {
  export { GlobOptions }
}
export = Globs
