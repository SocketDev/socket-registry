declare const Env: {
  envAsBoolean(value: any): boolean
  envAsNumber(value: any): number
  envAsString(value: any): string
}
declare namespace Env {}
export = Env
