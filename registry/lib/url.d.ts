declare const Url: {
  isUrl(value: URL): value is URL
  isUrl(value: string): value is string
  isUrl(value: any): value is URL | string
  parseUrl(value: any): URL | null
  urlSearchParamAsArray(value: any): string[]
  urlSearchParamAsBoolean(
    value: any,
    defaultValue?: boolean | undefined,
  ): boolean
}
declare namespace Url {}
export = Url
