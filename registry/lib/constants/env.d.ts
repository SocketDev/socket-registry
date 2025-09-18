declare interface ENV {
  readonly APPDATA: string
  readonly CI: boolean
  readonly DEBUG: string
  readonly HOME: string
  readonly LOCALAPPDATA: string
  readonly LOG_LEVEL: string
  readonly NODE_AUTH_TOKEN: string
  readonly NODE_ENV: string
  readonly NODE_OPTIONS: string
  readonly PRE_COMMIT: boolean
  readonly SOCKET_CLI_DEBUG: boolean
  readonly VITEST: boolean
}
declare const ENV: ENV
export = ENV
