declare const Env: {
  urlSearchParamAsArray(value: any): string[]
  urlSearchParamAsBoolean(
    value: any,
    defaultValue?: boolean | undefined
  ): boolean
}
declare namespace Env {}
export = Env
