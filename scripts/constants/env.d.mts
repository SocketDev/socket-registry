/** @fileoverview Type declarations for env constants. */
export declare function getEnv(): {
  CI: boolean
  NODE_ENV: string | undefined
  VERBOSE_BUILD: boolean
}
