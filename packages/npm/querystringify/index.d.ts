declare interface QueryStringify {
  parse(query: string): { [key: string]: string }
  stringify(obj: object, prefix?: boolean | string): string
}
declare const queryStringify: QueryStringify
export = queryStringify
