declare function envAsBoolean(value: any): boolean
declare function envAsString(value: any): string
declare const envModule: {
  envAsBoolean: typeof envAsBoolean
  envAsString: typeof envAsString
}
export = envModule
