/// <reference types="node" />

import type { PathLike } from 'node:fs'

declare type JsonArray = JsonValue[] | readonly JsonValue[]
declare type JsonObject = {
  [Key in string]: JsonValue
} & {
  [Key in string]?: JsonValue | undefined
}
declare type JsonParseOptions = {
  filepath?: PathLike | undefined
  reviver?: JsonReviver | undefined
  throws?: boolean | undefined
}
declare type JsonPrimitive = string | number | boolean | null
declare type JsonValue = JsonPrimitive | JsonObject | JsonArray
declare type JsonReviver = (this: any, key: string, value: any) => any
declare const Json: {
  isJsonPrimitive: (value: any) => value is boolean | null | number | string
  jsonParse: (
    content: string | Buffer,
    options?: JsonParseOptions | undefined,
  ) => JsonValue
}
declare namespace Json {
  export {
    JsonArray,
    JsonObject,
    JsonParseOptions,
    JsonPrimitive,
    JsonValue,
    JsonReviver,
  }
}
export = Json
