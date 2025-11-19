/** @fileoverview Type declarations for utils constants. */
export declare function getDefaultWhichOptions(): { path: string }
export declare function getLicenseContent(): string
export declare function getGitExecPath(): string
export declare function getTsxExecPath(): string
export declare function getGitIgnoreFile(): { ignores: string[] }
export declare function getIgnoreGlobs(): readonly string[]
export declare const PARSE_ARGS_CONFIG: {
  options: {
    force: { type: 'boolean'; short: 'f' }
    quiet: { type: 'boolean' }
  }
  strict: false
}
