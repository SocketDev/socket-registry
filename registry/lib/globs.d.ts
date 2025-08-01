/// <reference types="node" />
import { Remap } from './objects'

declare type Pattern = string
declare type FastGlobOptions = {
  /**
   * Return the absolute path for entries.
   *
   * @default false
   */
  absolute?: boolean
  /**
   * If set to `true`, then patterns without slashes will be matched against
   * the basename of the path if it contains slashes.
   *
   * @default false
   */
  baseNameMatch?: boolean
  /**
   * Enables Bash-like brace expansion.
   *
   * @default true
   */
  braceExpansion?: boolean
  /**
   * Enables a case-sensitive mode for matching files.
   *
   * @default true
   */
  caseSensitiveMatch?: boolean
  /**
   * Specifies the maximum number of concurrent requests from a reader to read
   * directories.
   *
   * @default os.cpus().length
   */
  concurrency?: number
  /**
   * The current working directory in which to search.
   *
   * @default process.cwd()
   */
  cwd?: string
  /**
   * Specifies the maximum depth of a read directory relative to the start
   * directory.
   *
   * @default Infinity
   */
  deep?: number
  /**
   * Allow patterns to match entries that begin with a period (`.`).
   *
   * @default false
   */
  dot?: boolean
  /**
   * Enables Bash-like `extglob` functionality.
   *
   * @default true
   */
  extglob?: boolean
  /**
   * Indicates whether to traverse descendants of symbolic link directories.
   *
   * @default true
   */
  followSymbolicLinks?: boolean
  /**
   * Custom implementation of methods for working with the file system.
   *
   * @default fs.*
   */
  fs?: any
  /**
   * Enables recursively repeats a pattern containing `**`.
   * If `false`, `**` behaves exactly like `*`.
   *
   * @default true
   */
  globstar?: boolean
  /**
   * An array of glob patterns to exclude matches.
   * This is an alternative way to use negative patterns.
   *
   * @default []
   */
  ignore?: Pattern[]
  /**
   * Mark the directory path with the final slash.
   *
   * @default false
   */
  markDirectories?: boolean
  /**
   * Returns objects (instead of strings) describing entries.
   *
   * @default false
   */
  objectMode?: boolean
  /**
   * Return only directories.
   *
   * @default false
   */
  onlyDirectories?: boolean
  /**
   * Return only files.
   *
   * @default true
   */
  onlyFiles?: boolean
  /**
   * Enables an object mode (`objectMode`) with an additional `stats` field.
   *
   * @default false
   */
  stats?: boolean
  /**
   * By default this package suppress only `ENOENT` errors.
   * Set to `true` to suppress any error.
   *
   * @default false
   */
  suppressErrors?: boolean
  /**
   * Throw an error when symbolic link is broken if `true` or safely
   * return `lstat` call if `false`.
   *
   * @default false
   */
  throwErrorOnBrokenSymbolicLink?: boolean
  /**
   * Ensures that the returned entries are unique.
   *
   * @default true
   */
  unique?: boolean
}
declare type GlobOptions = Remap<
  FastGlobOptions & {
    ignoreOriginals?: boolean | undefined
    recursive?: boolean | undefined
  }
>
declare const Globs: {
  getGlobMatcher: (
    glob: string | string[] | readonly string[],
    options?: object | undefined
  ) => (path: string) => boolean
  globStreamLicenses(
    dirname: string,
    options?: GlobOptions
  ): NodeJS.ReadableStream
}
declare namespace Globs {
  export { GlobOptions }
}
export = Globs
