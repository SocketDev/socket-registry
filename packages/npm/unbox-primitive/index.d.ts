declare function unboxPrimitive(value: bigint): bigint
declare function unboxPrimitive(value: boolean): boolean
declare function unboxPrimitive(value: number): number
declare function unboxPrimitive(value: string): string
declare function unboxPrimitive(value: symbol): symbol
declare function unboxPrimitive(
  value:
    | bigint
    | boolean
    // biome-ignore lint/complexity/noBannedTypes: Used to exclude functions from primitive types.
    | Function
    | null
    | number
    | string
    | symbol
    | undefined
    | unknown,
): never
export = unboxPrimitive
