declare interface ENV {
  readonly CI: boolean
  readonly NODE_AUTH_TOKEN: string
  readonly NODE_ENV: string
  readonly PRE_COMMIT: boolean
  readonly TAP: boolean
  readonly VITEST: boolean
}
declare const ENV: ENV
export = ENV
