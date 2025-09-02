declare const Env: {
  envAsBoolean(value: any, defaultValue?: boolean | undefined): boolean
  envAsNumber(value: any, defaultValue?: number | undefined): number
  envAsString(value: any, defaultValue?: string | undefined): string
}
declare namespace Env {}
export = Env
